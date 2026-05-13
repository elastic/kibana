/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import { CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import { buildCaseDataViewSpec, getCaseDataViewId } from './data_view_specs';
import { buildRuntimeFieldEntry } from './runtime_fields';

const TEMPLATES_PAGE_SIZE = 100;

interface CasesAnalyticsV2DataViewServiceDeps {
  logger: Logger;
  dataViewsService: DataViewsServerPluginStart;
  /**
   * Internal (no-request) SO client used for template reads. Templates are a
   * hidden SO type; the request-scoped client passed at ensure time may not
   * include them in its `includedHiddenTypes`. The internal client is opted
   * in to both `cases` and `cases-templates` at plugin start.
   *
   * The `namespaces: [spaceId]` filter on the find call scopes results to a
   * single space even though the client itself is unscoped.
   */
  internalSavedObjectsClient: SavedObjectsClientContract;
}

/**
 * Per-call dependencies for `ensureForSpace`. Sourced from the request that
 * triggered the ensure — the request-scoped SO client lands the data view in
 * the request's space automatically, no manual namespace juggling required.
 *
 * Templates are read via the internal SO client (held by the service from
 * construction time) because they're a hidden SO type the request-scoped
 * client may not opt into.
 */
interface EnsureForSpaceDeps {
  spaceId: string;
  /** Request-scoped SO client. Used for data view writes via the data-views service factory. */
  savedObjectsClient: SavedObjectsClientContract;
  /** Internal Elasticsearch client — data view runtime mappings are validated against it. */
  esClient: ElasticsearchClient;
  /** The originating request, required by the data views service factory. */
  request: KibanaRequest;
}

/**
 * Shape of the relevant subset of a template SO. Templates store a richer
 * `definition` blob — we only need the `fields` portion (with `name` and
 * `type`) to build runtime field entries. Typed loosely to avoid a strict
 * dependency on the full template schema; templates evolve independently
 * and we shouldn't need a v2 update every time a template field gains a
 * new property.
 */
interface TemplateAttributesLike {
  definition?: {
    fields?: Array<{ name?: unknown; type?: unknown }>;
  };
}

/**
 * Manages per-space `Cases` data views. One data view per space, each with a
 * runtime field map derived from THAT space's templates only.
 *
 * **Bootstrap model — lazy, per-request.** A space's data view is created
 * the first time a Cases request fires in that space (`ensureForSpace`
 * called from the request handler context). We skip subsequent calls within
 * the same Kibana process via an in-memory `Set` of bootstrapped space ids.
 * Process restart re-checks each space on first visit (idempotent — a doc
 * `get` returns the existing view).
 *
 * Why lazy rather than enumerating at start? Tenants with thousands of
 * spaces would pay heavy bootstrap cost even for spaces nobody visits.
 * Lazy spreads the cost across actual usage; spaces never visited via
 * Cases pay nothing.
 *
 * **Why runtime fields and not mapped fields?** Templates declare extended
 * fields at runtime; the cases plugin can't know at index-template-creation
 * time what users will declare. Instead, every extended-field value lands
 * as a keyword under `cases.extended_fields.<snake>`, and we publish a
 * typed runtime field at `cases.<snake>` that parses the keyword at query
 * time. See `runtime_fields.ts` for the snake-key → painless transform.
 *
 * **Template-change latency.** A new template's extended fields don't
 * appear in the data view until either:
 *   1. A Kibana process restart in this space (Set is empty, re-check
 *      finds the data view, runtime fields are refreshed during ensure).
 *   2. The operator calls `/reset` (drops all data views, in-memory Set
 *      is cleared, next request bootstraps fresh).
 * This is acceptable for PR 1; a follow-up can hook into the template SO
 * lifecycle for instant propagation.
 *
 * **Failure policy.** Never throws past the service boundary. Bootstrap or
 * sync failures log at WARN; the cases plugin's request handlers continue.
 * Users in a space whose data view failed to bootstrap will see "no data
 * view found" in Lens — operators inspect logs.
 */
export class CasesAnalyticsV2DataViewService {
  private readonly logger: Logger;
  private readonly deps: CasesAnalyticsV2DataViewServiceDeps;
  /**
   * Process-local cache of spaces we've already bootstrapped this run.
   * Cleared on plugin start (new process); /reset also clears it explicitly.
   */
  private readonly bootstrappedSpaces = new Set<string>();

  constructor(deps: CasesAnalyticsV2DataViewServiceDeps) {
    this.logger = deps.logger.get('dataView');
    this.deps = deps;
  }

  /**
   * Ensures the Cases data view exists in the given space, populating its
   * runtime field map from that space's templates. Idempotent — repeated
   * calls in the same process hit the in-memory cache and return immediately.
   *
   * Fire-and-forget by contract from the caller's perspective: errors are
   * caught internally and logged at WARN. The request handler context
   * invokes this without awaiting.
   */
  public async ensureForSpace(deps: EnsureForSpaceDeps): Promise<void> {
    if (this.bootstrappedSpaces.has(deps.spaceId)) return;

    try {
      const dvService = await this.deps.dataViewsService.dataViewsServiceFactory(
        deps.savedObjectsClient,
        deps.esClient,
        deps.request,
        true /* byPassCapabilities */
      );

      const dataViewId = getCaseDataViewId(deps.spaceId);

      let exists = false;
      try {
        await dvService.get(dataViewId);
        exists = true;
      } catch {
        // Not found — fall through to create. Other errors propagate to the
        // outer try/catch.
      }

      if (!exists) {
        const snakeKeys = await this.collectSnakeKeysForSpace(deps.spaceId);
        const runtimeFieldMap = this.buildRuntimeFieldMap(snakeKeys);

        const spec = buildCaseDataViewSpec(deps.spaceId);
        spec.runtimeFieldMap = runtimeFieldMap;

        // `overwrite: false` — the deterministic id means a second concurrent
        // create from another node hits a conflict error rather than racing.
        // Caught and logged as the data view already exists at that point.
        await dvService.createAndSave(spec, false, true);
        this.logger.info(
          `bootstrapped data view ${dataViewId} (space=${deps.spaceId}, runtime_fields=${
            Object.keys(runtimeFieldMap).length
          })`
        );
      }

      this.bootstrappedSpaces.add(deps.spaceId);
    } catch (err) {
      this.logger.warn(
        `cases-analyticsV2: data view ensure failed for space=${deps.spaceId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  /**
   * Clears the in-memory bootstrapped-spaces cache so the next request in
   * each space re-checks (and recreates if missing). Called from the
   * `/reset` route after the operator has deleted the underlying data view
   * SOs out-of-band — without this, the Set would still claim "bootstrapped"
   * for every space and the data views would stay missing until process
   * restart.
   */
  public clearBootstrapCache(): void {
    this.bootstrappedSpaces.clear();
  }

  // ----- Internals -----

  /**
   * Page through every template SO in the given space and extract
   * `<name>_as_<type>` snake-keys from each one's declared fields. Uses the
   * internal SO client (held since construction) — templates are hidden and
   * the request-scoped client may not include them.
   */
  private async collectSnakeKeysForSpace(spaceId: string): Promise<string[]> {
    const out: string[] = [];
    let page = 1;

    while (true) {
      const response = await this.deps.internalSavedObjectsClient.find<TemplateAttributesLike>({
        type: CASE_TEMPLATE_SAVED_OBJECT,
        perPage: TEMPLATES_PAGE_SIZE,
        page,
        // Single-space scope — runtime fields for this view are derived
        // only from templates in this space.
        namespaces: [spaceId],
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
      // Last write wins on collisions WITHIN a space — two templates in the
      // same space declaring the same `<name>_as_<type>` produce the same
      // entry, so there's nothing to merge. Two templates declaring
      // `<name>_as_<type1>` and `<name>_as_<type2>` would conflict; we pick
      // whichever appears last. Templates aren't supposed to disagree on
      // type for a given name within a space, but this keeps the runtime
      // resilient. Cross-space collisions don't happen at all — each space
      // has its own map.
      if (entry != null) {
        map[entry.fieldName] = entry.spec;
      }
    }
    return map;
  }
}
