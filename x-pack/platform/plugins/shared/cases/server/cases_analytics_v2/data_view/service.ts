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
import { buildRuntimeFieldEntry, computeRuntimeFieldsFingerprint } from './runtime_fields';

const TEMPLATES_PAGE_SIZE = 100;

/**
 * How long an "ensured" entry stays trusted before the next request in
 * that space re-runs the full ensure path. Bounds the recovery time when
 * an administrator deletes a per-space data view out-of-band (e.g. via
 * Stack Management UI rather than the `/reset` route, which would clear
 * the cache directly). Without an upper bound the in-memory cache could
 * mask a missing data view for the lifetime of the Kibana process.
 *
 * Trade-off: every request after the TTL pays one templates page-read +
 * one data view get; both are typically a single round-trip and the cost
 * is bounded by space count, not request volume.
 */
const BOOTSTRAP_CACHE_TTL_MS = 5 * 60 * 1000;

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
 * Tracks a successful ensure for a single space.
 *
 * - `ensuredAt` drives the TTL guard against out-of-band data view
 *   deletion (entries past the TTL re-run the full ensure path).
 * - `fingerprint` is the digest of the snake-keys collected at the last
 *   successful ensure. When a subsequent ensure recomputes the same
 *   fingerprint we skip the data view fetch + `isEqual` diff entirely —
 *   this is the dominant cost in template-edit bursts at scale.
 *
 * Both fields are written together inside `ensureOrRefreshForSpace` and
 * read together by the cache check; treating them as a unit avoids
 * partial-state confusion if one is updated without the other.
 */
interface BootstrapEntry {
  ensuredAt: number;
  fingerprint: string;
}

/**
 * Manages per-space `Cases` data views. One data view per space; each
 * carries a runtime field map derived from THAT space's templates only.
 *
 * **Lazy bootstrap.** A space's data view is created on the first Cases
 * request in that space; subsequent in-process requests short-circuit via
 * an in-memory `Set`. Tenants with thousands of unused spaces pay nothing
 * until usage.
 *
 * **Runtime fields, not mapped fields.** Extended-field values land as
 * keywords under `cases.extended_fields.<snake>`; we publish a typed
 * runtime field at `cases.<snake>` that parses at query time. See
 * `runtime_fields.ts` for the snake-key → painless transform.
 *
 * **Template change → data view propagation:**
 *   1. Template SO lifecycle hook (templates service) → `refreshForSpace`
 *      after every create / update / delete. Fire-and-forget; the next
 *      access path repairs on failure.
 *   2. Kibana restart → cache is empty; `ensureForSpace` recomputes the
 *      desired map and diffs against the persisted data view.
 *   3. Administrator `/reset` → drops all per-space data views and clears
 *      the cache.
 *
 * **Failure policy.** Never throws past the service boundary. Bootstrap
 * failures log at WARN; users in an affected space see "no data view
 * found" in Lens until the next refresh path resolves.
 */
export class CasesAnalyticsV2DataViewService {
  private readonly logger: Logger;
  private readonly deps: CasesAnalyticsV2DataViewServiceDeps;
  /**
   * Process-local cache of spaces we've already bootstrapped this run.
   * Entries older than `BOOTSTRAP_CACHE_TTL_MS` re-run the full ensure
   * path on the next request — the only mechanism that recovers from
   * out-of-band data view deletion (admin UI, scripts) short of process
   * restart or `/reset`. Each entry also carries the snake-key fingerprint
   * from the last successful ensure so within-TTL refreshes can skip the
   * data view fetch + diff when the desired state hasn't changed.
   * Cleared on plugin start (new process); `/reset` also clears it.
   */
  private readonly bootstrappedSpaces = new Map<string, BootstrapEntry>();

  constructor(deps: CasesAnalyticsV2DataViewServiceDeps) {
    this.logger = deps.logger.get('dataView');
    this.deps = deps;
  }

  /**
   * Test-only seam — overridden in `service.test.ts` to make TTL behaviour
   * deterministic without `jest.useFakeTimers()` (which would interfere
   * with the data view service's own internal timers).
   */
  protected now(): number {
    return Date.now();
  }

  /**
   * Ensures the Cases data view exists in the given space and its
   * runtime field map matches the union of that space's templates.
   * Idempotent — in-process repeats hit the cache after the first success.
   *
   * The desired runtime field map is computed up-front so all branches
   * compare like for like:
   *   - missing → create with the freshly-computed map;
   *   - exists, map matches → no-op;
   *   - exists, map differs → update in place.
   * Computing up-front is what makes restart refresh stale fields without
   * waiting for `/reset`.
   *
   * Fire-and-forget: errors caught internally and logged at WARN.
   */
  public async ensureForSpace(deps: EnsureForSpaceDeps): Promise<void> {
    const cached = this.bootstrappedSpaces.get(deps.spaceId);
    if (cached != null && this.now() - cached.ensuredAt < BOOTSTRAP_CACHE_TTL_MS) return;
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
      const dataViewId = getCaseDataViewId(deps.spaceId);

      // Compute snake-keys + fingerprint first. The fingerprint is a stable
      // digest of the snake-key set; if it matches the last successful
      // ensure on this node we can skip the data view fetch + isEqual diff
      // entirely. This is the dominant cost path during template-edit bursts
      // (most edits — name, tags, validation — don't change snake-keys at
      // all). Fail-open: a cache miss is just current behaviour.
      const snakeKeys = await this.collectSnakeKeysForSpace(deps.spaceId);
      const fingerprint = computeRuntimeFieldsFingerprint(snakeKeys);
      const cached = this.bootstrappedSpaces.get(deps.spaceId);
      if (cached?.fingerprint === fingerprint) {
        // Same intended state. Refresh the timestamp so the TTL window
        // restarts (we just verified upstream templates haven't drifted).
        cached.ensuredAt = this.now();
        return;
      }

      const dvService = await this.deps.dataViewsService.dataViewsServiceFactory(
        deps.savedObjectsClient,
        deps.esClient,
        deps.request,
        true /* byPassCapabilities */
      );

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
          existing.replaceAllRuntimeFields(desiredRuntimeFieldMap as Record<string, RuntimeField>);
          await dvService.updateSavedObject(existing);
          this.logger.info(
            `refreshed runtime fields on data view ${dataViewId} (space=${
              deps.spaceId
            }, runtime_fields=${Object.keys(desiredRuntimeFieldMap).length})`
          );
        }
      }

      this.bootstrappedSpaces.set(deps.spaceId, {
        ensuredAt: this.now(),
        fingerprint,
      });
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
   * `/reset` route after the administrator has deleted the underlying data view
   * SOs out-of-band — without this, the Set would still claim "bootstrapped"
   * for every space and the data views would stay missing until process
   * restart.
   */
  public clearBootstrapCache(): void {
    this.bootstrappedSpaces.clear();
  }

  // ----- Internals -----

  /**
   * Page through every active template SO in the given space and extract
   * `<name>_as_<type>` snake-keys from each template's persisted
   * `attributes.fieldNames` array. (`attributes.definition` is YAML on
   * disk; structured `{ name, type }` only exists as transient parser
   * output during create / update.)
   *
   * Uses the internal SO client because templates are hidden and the
   * request-scoped client may not include them.
   *
   * Filters apply the templates service's own definition of "live":
   *   - `isLatest: true` — old versions don't contribute fields a renamed
   *     template no longer publishes.
   *   - `NOT deletedAt: *` — soft-deleted templates don't contribute.
   * `fields: ['fieldNames']` keeps the response payload to the only
   *  attribute we read; the SO API skips migrations for partial-field
   *  reads, which is safe here because both filter fields and `fieldNames`
   *  have been part of the template SO since its first model version.
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
        filter: `${CASE_TEMPLATE_SAVED_OBJECT}.attributes.isLatest: true AND NOT ${CASE_TEMPLATE_SAVED_OBJECT}.attributes.deletedAt: *`,
        fields: ['fieldNames'],
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
