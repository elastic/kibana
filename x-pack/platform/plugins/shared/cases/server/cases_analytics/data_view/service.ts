/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load as parseYaml } from 'js-yaml';
import type {
  ElasticsearchClient,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { DataView, RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import type { Template } from '../../../common/types/domain/template/latest';
import { getFieldSnakeKey } from '../../../common/utils';
import { CASES_DATA_SURFACES, type CasesDataSurface } from '../constants';
import { buildBaseDataViewSpec, CASES_DATA_VIEW_IDS } from './data_view_specs';
import { buildRuntimeFieldEntry } from './runtime_fields';

interface ServiceDeps {
  logger: Logger;
  dataViewsService: DataViewsServerPluginStart;
  /**
   * Internal-user SO client used both to create/load data views and to scan
   * templates during reconciliation. Created at plugin start; never tied to
   * a request.
   */
  internalSavedObjectsClient: SavedObjectsClientContract;
  /**
   * Internal ES client. Required by the data views service factory but we
   * don't use it directly here.
   */
  esClient: ElasticsearchClient;
}

/**
 * Surfaces that get extended-fields runtime mappings. `case_activity` is
 * intentionally excluded — activity rows are event-level data, and we don't
 * want every activity row to carry the case's extended fields in any form.
 */
const SURFACES_WITH_EXTENDED_FIELDS: CasesDataSurface[] = ['case', 'case_lifecycle'];

const TEMPLATES_PAGE_SIZE = 100;

/**
 * Manages the three cases-data data views (one per surface), and keeps their
 * `runtimeFieldMap` in sync with extended-field declarations across all
 * templates. The data view at `cases.extended_fields.<snakeKey>` shadows the
 * indexed keyword field with a typed runtime field per `_as_<type>` suffix.
 *
 * Designed for two trigger sources:
 *   - On template create / update / delete, callers invoke
 *     `onTemplateChanged()` to apply an incremental update. Fire-and-forget;
 *     failures log but never propagate.
 *   - On plugin start, `start()` ensures the views exist and runs an initial
 *     full reconcile (covers the case where a Kibana node missed write events
 *     while down). The reconciliation task can also call `reconcile()` on
 *     schedule as a backstop.
 */
export class CasesAnalyticsDataViewService {
  private readonly logger: Logger;
  private readonly deps: ServiceDeps;

  constructor(deps: ServiceDeps) {
    this.logger = deps.logger.get('cases.analytics.data_view');
    this.deps = deps;
  }

  /**
   * Bootstrap. Idempotent — safe to call from multiple Kibana nodes
   * concurrently. Creates the three managed data views if missing, then
   * runs a reconcile so any extended fields declared on existing templates
   * get runtime mappings.
   */
  async start(): Promise<void> {
    try {
      for (const surface of CASES_DATA_SURFACES) {
        await this.ensureDataView(surface);
      }
      await this.reconcile();
      this.logger.info('cases-as-data: data views ensured + extended-field runtime fields synced');
    } catch (err) {
      this.logger.warn(`cases-as-data: data view bootstrap failed: ${err.message}`);
    }
  }

  /**
   * Hook invoked by the templates service post-success on
   * createTemplate/updateTemplate. Fire-and-forget by contract — the caller
   * does not await. The reconciliation task is the durability backstop for
   * any failures.
   */
  onTemplateChanged(template: SavedObject<Template>): void {
    const fieldEntries = this.extractRuntimeFieldsFromTemplate(template);
    if (fieldEntries.length === 0) {
      this.logger.debug(`template ${template.id} has no typed extended fields; skipping`);
      return;
    }

    void this.applyRuntimeFields(SURFACES_WITH_EXTENDED_FIELDS, fieldEntries).catch((err) => {
      this.logger.error(
        `cases-as-data: runtime field sync failed for template ${template.id}: ${err.message}`,
        { error: err }
      );
    });
  }

  /**
   * Full reconcile across every template. Idempotent. Used at start and
   * (optionally) by the periodic reconciliation task as a backstop.
   */
  async reconcile(): Promise<void> {
    const allEntries = await this.collectRuntimeFieldsFromAllTemplates();
    if (allEntries.length === 0) {
      this.logger.debug('no typed extended fields found across templates; nothing to reconcile');
      return;
    }
    await this.applyRuntimeFields(SURFACES_WITH_EXTENDED_FIELDS, allEntries);
  }

  // --- internals ---

  private async ensureDataView(surface: CasesDataSurface): Promise<void> {
    const id = CASES_DATA_VIEW_IDS[surface];
    const dvService = await this.deps.dataViewsService.dataViewsServiceFactory(
      this.deps.internalSavedObjectsClient,
      this.deps.esClient,
      undefined,
      true /* byPassCapabilities */
    );

    try {
      await dvService.get(id);
      this.logger.debug(`data view ${id} already exists`);
      return;
    } catch (err) {
      if (err?.output?.statusCode !== 404 && err?.statusCode !== 404) {
        // Any error other than "not found" is unexpected; surface but
        // continue trying to create — createAndSave's overwrite=false will
        // handle a race with another node's bootstrap.
        this.logger.debug(`data view ${id} get returned non-404: ${err.message}`);
      }
    }

    try {
      await dvService.createAndSave(buildBaseDataViewSpec(surface), false, true);
      this.logger.info(`data view ${id} created (managed)`);
    } catch (err) {
      // Concurrent bootstrap from another Kibana node — the SO already
      // exists. Treat as success.
      const msg = err?.message ?? '';
      if (msg.toLowerCase().includes('duplicate') || err?.output?.statusCode === 409) {
        this.logger.debug(`data view ${id} already created concurrently; continuing`);
        return;
      }
      throw err;
    }
  }

  private extractRuntimeFieldsFromTemplate(
    template: SavedObject<Template>
  ): Array<{ fieldName: string; spec: RuntimeFieldSpec }> {
    const definition = template.attributes?.definition;
    if (!definition) return [];

    let parsed: { fields?: Array<{ name: string; type: string }> };
    try {
      parsed = parseYaml(definition) as typeof parsed;
    } catch (err) {
      this.logger.warn(`template ${template.id} has unparseable YAML; skipping runtime field sync`);
      return [];
    }

    const fields = parsed?.fields;
    if (!Array.isArray(fields)) return [];

    const entries: Array<{ fieldName: string; spec: RuntimeFieldSpec }> = [];
    for (const f of fields) {
      if (!f?.name || !f?.type) continue;
      const snakeKey = getFieldSnakeKey(f.name, f.type);
      const entry = buildRuntimeFieldEntry(snakeKey);
      if (entry) entries.push(entry);
    }
    return entries;
  }

  private async collectRuntimeFieldsFromAllTemplates(): Promise<
    Array<{ fieldName: string; spec: RuntimeFieldSpec }>
  > {
    const out = new Map<string, RuntimeFieldSpec>();
    let page = 1;
    while (true) {
      const res = await this.deps.internalSavedObjectsClient.find<Template>({
        type: 'cases-templates',
        page,
        perPage: TEMPLATES_PAGE_SIZE,
        namespaces: ['*'],
      });
      for (const so of res.saved_objects) {
        for (const entry of this.extractRuntimeFieldsFromTemplate(so)) {
          // Last writer wins on collision (e.g., two templates both declaring
          // `riskScore_as_long`). Since both use the same name + suffix, the
          // resulting runtime field spec is byte-equal anyway.
          out.set(entry.fieldName, entry.spec);
        }
      }
      if (res.saved_objects.length < TEMPLATES_PAGE_SIZE) break;
      page += 1;
    }
    return [...out.entries()].map(([fieldName, spec]) => ({ fieldName, spec }));
  }

  private async applyRuntimeFields(
    surfaces: CasesDataSurface[],
    entries: Array<{ fieldName: string; spec: RuntimeFieldSpec }>
  ): Promise<void> {
    if (entries.length === 0) return;

    const dvService = await this.deps.dataViewsService.dataViewsServiceFactory(
      this.deps.internalSavedObjectsClient,
      this.deps.esClient,
      undefined,
      true
    );

    for (const surface of surfaces) {
      const id = CASES_DATA_VIEW_IDS[surface];
      let view: DataView;
      try {
        view = await dvService.get(id);
      } catch (err) {
        // The view doesn't exist yet — bootstrap probably hasn't completed
        // on this node. Skip this surface; reconcile() at the next start /
        // periodic tick will catch up.
        this.logger.debug(`data view ${id} not yet present; deferring runtime field merge`);
        continue;
      }

      let mutated = false;
      for (const { fieldName, spec } of entries) {
        const existing = view.getRuntimeField(fieldName);
        // Only patch when the spec actually changed; identical re-applies are
        // a no-op so the SO version doesn't churn on concurrent nodes.
        if (existing?.type === spec.type && existing?.script?.source === spec.script?.source) {
          continue;
        }
        view.addRuntimeField(fieldName, spec);
        mutated = true;
      }

      if (!mutated) {
        this.logger.debug(`data view ${id}: no runtime field changes`);
        continue;
      }

      try {
        await dvService.updateSavedObject(view);
        this.logger.info(
          `data view ${id}: synced ${entries.length} extended-field runtime mapping(s)`
        );
      } catch (err) {
        this.logger.error(
          `data view ${id}: failed to persist runtime field updates: ${err.message}`,
          { error: err }
        );
      }
    }
  }
}
