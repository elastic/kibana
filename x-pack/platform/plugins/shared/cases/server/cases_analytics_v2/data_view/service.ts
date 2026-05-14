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
import { isEqual } from 'lodash';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { DataView, RuntimeField, RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
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
 * Shape of the relevant subset of a template SO. The persisted
 * `attributes.definition` is the raw YAML string the user submitted —
 * structured field metadata lives on `attributes.fieldNames`, an array
 * populated at create / update time by `toFieldNames(parsedDefinition.fields)`
 * (see `services/templates/index.ts`).
 *
 * Typed loosely with `unknown` per element so a future template-field type
 * (`metadata`, `display`, `validation`, etc.) that we don't care about here
 * can land without a v2 update.
 */
interface TemplateAttributesLike {
  fieldNames?: Array<{ name?: unknown; type?: unknown }>;
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
 * **Template-change latency.** A new template's extended fields propagate
 * to the data view via three paths:
 *   1. Template SO lifecycle hook — the templates service calls
 *      `refreshForSpace` after every create / update / delete, so in-process
 *      changes land on the data view immediately. Fire-and-forget; failures
 *      log at WARN and the next access path repairs.
 *   2. Kibana process restart — the Set is empty, `ensureForSpace`
 *      computes the freshly-derived runtime field map and diffs it against
 *      the persisted data view's map. Different → update; same → skip.
 *   3. Operator-initiated `/reset` — drops all per-space data views and
 *      clears the in-memory Set; the next request rebuilds from scratch.
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
   * Ensures the Cases data view exists in the given space and that its
   * runtime field map matches the union of currently-declared template
   * fields in that space.
   *
   * Idempotent. Repeated calls in the same process hit the in-memory cache
   * and return immediately after the first successful run.
   *
   * **Behaviour by branch.** The runtime field map is computed up-front so
   * the existence-check branches make a like-for-like comparison:
   *   - Data view doesn't exist → create with the freshly-computed map.
   *   - Data view exists, runtime field map matches → no-op.
   *   - Data view exists, runtime field map differs → update in place.
   * Computing up-front is what makes process restart actually refresh
   * runtime fields when templates have been added between restarts —
   * without it, the existence check short-circuits and stale runtime fields
   * would persist until `/reset` ran.
   *
   * Fire-and-forget by contract from the caller's perspective: errors are
   * caught internally and logged at WARN. The request handler context
   * invokes this without awaiting.
   */
  public async ensureForSpace(deps: EnsureForSpaceDeps): Promise<void> {
    if (this.bootstrappedSpaces.has(deps.spaceId)) return;
    await this.ensureOrRefreshForSpace(deps);
  }

  /**
   * Force-refresh path used by template lifecycle hooks. Same compute +
   * diff + update flow as `ensureForSpace`, but bypasses the in-memory
   * bootstrap cache so a template create / update / delete in a space that
   * has already been ensured this process actually re-runs the diff.
   *
   * Fire-and-forget like `ensureForSpace`.
   */
  public async refreshForSpace(deps: EnsureForSpaceDeps): Promise<void> {
    await this.ensureOrRefreshForSpace(deps);
  }

  /**
   * Shared body for `ensureForSpace` and `refreshForSpace`. The only
   * difference between the two is whether the in-memory cache short-circuit
   * runs ahead of this call — once we're in here, the work is identical.
   */
  private async ensureOrRefreshForSpace(deps: EnsureForSpaceDeps): Promise<void> {
    try {
      const dvService = await this.deps.dataViewsService.dataViewsServiceFactory(
        deps.savedObjectsClient,
        deps.esClient,
        deps.request,
        true /* byPassCapabilities */
      );

      const dataViewId = getCaseDataViewId(deps.spaceId);

      // Compute the desired runtime field map up-front so we can compare it
      // against an existing data view on the diff branch below. Cheap (one
      // paginated SO read of templates in this space) and gives both
      // branches a consistent view.
      const snakeKeys = await this.collectSnakeKeysForSpace(deps.spaceId);
      const desiredRuntimeFieldMap = this.buildRuntimeFieldMap(snakeKeys);

      const existing = await this.getDataViewIfExists(dvService, dataViewId);

      if (existing == null) {
        const spec = buildCaseDataViewSpec(deps.spaceId);
        spec.runtimeFieldMap = desiredRuntimeFieldMap;

        // `overwrite: false` — the deterministic id means a second concurrent
        // create from another node hits a conflict error rather than racing.
        // Caught and logged as the data view already exists at that point.
        await dvService.createAndSave(spec, false, true);
        this.logger.info(
          `bootstrapped data view ${dataViewId} (space=${deps.spaceId}, runtime_fields=${
            Object.keys(desiredRuntimeFieldMap).length
          })`
        );
      } else {
        // `toSpec()` clones internal state, so it's safe to read without
        // worrying about mutating the cached DataView.
        const currentRuntimeFieldMap = existing.toSpec().runtimeFieldMap ?? {};
        if (!isEqual(currentRuntimeFieldMap, desiredRuntimeFieldMap)) {
          // `RuntimeFieldSpec` is structurally compatible with `RuntimeField`
          // for the (type + script) entries this surface produces — the cast
          // crosses the public/private contract boundary without introducing
          // any extra fields. `replaceAllRuntimeFields` strips field-attribute
          // metadata internally, so a round-trip through `toSpec()` returns
          // the same shape we wrote.
          existing.replaceAllRuntimeFields(
            desiredRuntimeFieldMap as Record<string, RuntimeField>
          );
          await dvService.updateSavedObject(existing);
          this.logger.info(
            `refreshed runtime fields on data view ${dataViewId} (space=${deps.spaceId}, runtime_fields=${
              Object.keys(desiredRuntimeFieldMap).length
            })`
          );
        }
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
   * Returns the data view if present, `null` if not. Any other failure
   * propagates to the caller's try/catch.
   */
  private async getDataViewIfExists(
    dvService: Awaited<ReturnType<DataViewsServerPluginStart['dataViewsServiceFactory']>>,
    dataViewId: string
  ): Promise<DataView | null> {
    try {
      return await dvService.get(dataViewId);
    } catch (err) {
      const status =
        (err as { statusCode?: number })?.statusCode ??
        (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
      if (status === 404) return null;
      // Some `dvService.get` failure paths surface as plain `Error('Saved
      // object [...] not found')` without a status code. Fall back to a
      // message check to avoid misclassifying real failures as not-found.
      const message = err instanceof Error ? err.message : String(err);
      if (/not\s+found/i.test(message)) return null;
      throw err;
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
   * `<name>_as_<type>` snake-keys from each template's persisted
   * `fieldNames` array.
   *
   * **Why `fieldNames`, not `definition`.** `attributes.definition` is the
   * raw YAML string the user submitted — the structured `{ name, type }`
   * pairs only exist as transient parser output during create / update
   * request handling. The persisted form lives on `attributes.fieldNames`,
   * populated by `toFieldNames(parsedDefinition.fields)` in
   * `services/templates/index.ts`. Reading from there is the only way to
   * recover field metadata after the request has completed.
   *
   * Uses the internal SO client (held since construction) — templates are
   * hidden and the request-scoped client may not include them.
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
        const fieldNames = tpl.attributes?.fieldNames ?? [];
        for (const f of fieldNames) {
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
      // The `<name>_as_<type>` suffix is a feature, not a workaround.
      // Different solutions in the same space can store a logically-shared
      // field name under different physical types — Security may want
      // `classification_as_keyword`, Observability may want
      // `classification_as_long`, and both coexist as distinct runtime
      // fields with no collision. Two templates declaring the identical
      // `<name>_as_<type>` produce the identical entry; map insertion is
      // idempotent. Cross-space collisions don't happen at all — each
      // space has its own map.
      if (entry != null) {
        map[entry.fieldName] = entry.spec;
      }
    }
    return map;
  }
}
