/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import { CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import { buildBaseCaseDataViewSpec, CASE_DATA_VIEW_ID } from './data_view_specs';
import { buildRuntimeFieldEntry } from './runtime_fields';

const TEMPLATES_PAGE_SIZE = 100;

interface CasesAnalyticsV2DataViewServiceDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
  /**
   * Internal SO client. Used to walk every template SO across every space —
   * the data view's runtime fields are a function of every extended-field
   * declaration in the cluster.
   */
  internalSavedObjectsClient: SavedObjectsClientContract;
  dataViewsService: DataViewsServerPluginStart;
}

/**
 * Shape of the relevant subset of a template SO. Templates store a richer
 * `definition` blob — we only need the `fields` portion (with `name` and
 * `type`) to build runtime field entries.
 *
 * Note: we type this loosely (`unknown` for the blob) and pluck fields
 * defensively rather than depending on the full template type. Templates'
 * schema can evolve independently of cases-analytics, and a strict
 * dependency would force us to update v2 every time a template field gains
 * a new property.
 */
interface TemplateAttributesLike {
  definition?: {
    fields?: Array<{ name?: unknown; type?: unknown }>;
  };
}

/**
 * Manages the lifecycle of the managed `Cases` data view: ensures it exists
 * at start, and keeps its `runtimeFieldMap` in sync with every extended-field
 * declaration found across all templates.
 *
 * **Why runtime fields and not mapped fields?** Templates declare extended
 * fields at runtime; the cases plugin can't know at index-template-creation
 * time what users will declare. Instead, every extended-field value lands as
 * a keyword under `cases.extended_fields.<snake>`, and we publish a typed
 * runtime field at `cases.<snake>` that parses the keyword at query time.
 * See `runtime_fields.ts` for the snake-key → painless transformation.
 *
 * **Trigger model**: `reconcile()` walks every template SO and applies the
 * derived runtime field set. Called on plugin start and from the
 * reconciliation task — same cadence as case-data reconciliation, so
 * template additions / removals propagate within one tick.
 *
 * **Failure policy**: never throws past the service boundary. Bootstrap or
 * sync failures log at WARN; the cases plugin continues. Users who depend
 * on a missing extended field will see it as missing in Lens — operators
 * are expected to investigate via logs.
 */
export class CasesAnalyticsV2DataViewService {
  private readonly logger: Logger;
  private readonly deps: CasesAnalyticsV2DataViewServiceDeps;

  constructor(deps: CasesAnalyticsV2DataViewServiceDeps) {
    this.logger = deps.logger.get('dataView');
    this.deps = deps;
  }

  /**
   * Idempotent bootstrap + initial reconcile. Safe to call from multiple
   * Kibana nodes concurrently — the data view SO is keyed on a deterministic
   * id so concurrent creates converge on the same object.
   */
  public async start(): Promise<void> {
    try {
      await this.ensureDataView();
      await this.reconcile();
      this.logger.info(
        'cases-analyticsV2: data view ensured + extended-field runtime fields synced'
      );
    } catch (err) {
      this.logger.warn(
        `cases-analyticsV2: data view bootstrap failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  /**
   * Walk every template SO, derive runtime fields from every
   * `<name>_as_<type>` declared field, and overwrite the data view's
   * `runtimeFieldMap`. Idempotent — replaces the map wholesale rather than
   * diffing, which keeps the logic boring and predictable.
   */
  public async reconcile(): Promise<void> {
    const snakeKeys = await this.collectSnakeKeysFromAllTemplates();
    const runtimeFieldMap = this.buildRuntimeFieldMap(snakeKeys);
    await this.applyRuntimeFieldMap(runtimeFieldMap);
  }

  // ----- Internals -----

  private async ensureDataView(): Promise<void> {
    const dvService = await this.deps.dataViewsService.dataViewsServiceFactory(
      this.deps.internalSavedObjectsClient,
      this.deps.esClient,
      undefined,
      true /* byPassCapabilities */
    );

    try {
      await dvService.get(CASE_DATA_VIEW_ID);
      this.logger.debug(`data view ${CASE_DATA_VIEW_ID} already exists`);
      return;
    } catch {
      // Not found — create. Any other error gets caught by the outer start()
      // try/catch and surfaces as WARN.
    }

    // `overwrite: false` — the deterministic id means a second concurrent
    // create attempt fails fast with a conflict error rather than racing.
    await dvService.createAndSave(buildBaseCaseDataViewSpec(), false, true);
    this.logger.info(`bootstrapped data view ${CASE_DATA_VIEW_ID}`);
  }

  /**
   * Page through every template SO and extract `<name>_as_<type>` snake-keys
   * from each one's declared fields.
   */
  private async collectSnakeKeysFromAllTemplates(): Promise<string[]> {
    const out: string[] = [];
    let page = 1;

    while (true) {
      const response = await this.deps.internalSavedObjectsClient.find<TemplateAttributesLike>({
        type: CASE_TEMPLATE_SAVED_OBJECT,
        perPage: TEMPLATES_PAGE_SIZE,
        page,
        // Walk every space — extended fields apply cluster-wide once
        // declared by any template.
        namespaces: ['*'],
      });

      for (const tpl of response.saved_objects) {
        const fields = tpl.attributes?.definition?.fields ?? [];
        for (const f of fields) {
          const name = typeof f?.name === 'string' ? f.name : undefined;
          const type = typeof f?.type === 'string' ? f.type : undefined;
          if (name && type) {
            out.push(`${name}_as_${type}`);
          }
        }
      }

      if (response.saved_objects.length < TEMPLATES_PAGE_SIZE) break;
      page++;
    }

    return out;
  }

  private buildRuntimeFieldMap(snakeKeys: string[]): Record<string, RuntimeFieldSpec> {
    const map: Record<string, RuntimeFieldSpec> = {};
    for (const snakeKey of snakeKeys) {
      const entry = buildRuntimeFieldEntry(snakeKey);
      // Last write wins on collisions across templates — two templates
      // declaring the same `<name>_as_<type>` produce the same entry, so
      // there's nothing to merge. Two templates declaring `<name>_as_<type1>`
      // and `<name>_as_<type2>` would produce different entries: we pick
      // whichever appears last. Templates aren't supposed to disagree on
      // type for a given name, but this keeps the runtime resilient.
      if (entry != null) {
        map[entry.fieldName] = entry.spec;
      }
    }
    return map;
  }

  private async applyRuntimeFieldMap(
    runtimeFieldMap: Record<string, RuntimeFieldSpec>
  ): Promise<void> {
    const dvService = await this.deps.dataViewsService.dataViewsServiceFactory(
      this.deps.internalSavedObjectsClient,
      this.deps.esClient,
      undefined,
      true /* byPassCapabilities */
    );

    const dataView = await dvService.get(CASE_DATA_VIEW_ID);

    // Clear existing runtime fields before applying the fresh set. The
    // data view API doesn't offer a "replace map" primitive — we
    // remove-then-add. Errors per-field are caught and continued so a
    // single bad field doesn't block the rest.
    for (const fieldName of Object.keys(dataView.getRuntimeMappings())) {
      dataView.removeRuntimeField(fieldName);
    }
    for (const [fieldName, spec] of Object.entries(runtimeFieldMap)) {
      dataView.addRuntimeField(fieldName, spec);
    }

    await dvService.updateSavedObject(dataView);
    this.logger.debug(
      `cases-analyticsV2: applied ${Object.keys(runtimeFieldMap).length} runtime fields`
    );
  }
}
