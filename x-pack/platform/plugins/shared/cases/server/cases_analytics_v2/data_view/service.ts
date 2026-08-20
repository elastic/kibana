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
import { parse as parseYaml } from 'yaml';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { DataView, RuntimeField, RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import {
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
} from '../../../common/constants';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { isDisplayOnlyField } from '../../../common/types/domain/template/fields';
import { ParsedTemplateDefinitionSchema } from '../../../common/types/domain/template/latest';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import {
  getFieldSnakeKey,
  parseFieldDefinitionsToInlineFields,
  resolveTemplateFields,
} from '../../../common/utils/template_fields';
import { buildCaseDataViewSpec, getCaseDataViewId } from './data_view_specs';
import { buildRuntimeFieldEntry, computeRuntimeFieldsFingerprint } from './runtime_fields';

const TEMPLATES_PAGE_SIZE = 100;
const FIELD_DEFINITIONS_PAGE_SIZE = 100;

/**
 * How long an "ensured" entry stays trusted before the next request in
 * that space re-runs the full ensure path. Bounds the recovery time when
 * an administrator deletes a per-space data view out-of-band (e.g. via
 * Stack Management), and — more commonly — the lag before runtime fields
 * appear when config is created through a path that can't fire the refresh
 * hook (the legacy customFields → v2 templates migration, or raw
 * `repo.create` writes that bypass the services). `/reset` and the
 * migration-completion nudge clear the cache directly for the paths they
 * own; this TTL is the fallback for everything else.
 *
 * Kept short (one minute) so that fallback self-heal is measured in
 * seconds rather than the minutes it used to take. Trade-off: every
 * request after the TTL pays one templates page-read plus one data view
 * `get`. Both are typically single round-trips and the cost is bounded by
 * space count, not request volume, so a shorter window is cheap.
 */
const BOOTSTRAP_CACHE_TTL_MS = 60 * 1000;

/**
 * Detects the "another node already created this data view" outcome of the
 * bootstrap create, across the two shapes it can take on the
 * `create` + `createSavedObject` call site:
 *
 *   1. ES's `version_conflict_engine_exception` — the SO create itself
 *      lost the race on the deterministic id. The plugin's `statusCode`
 *      coverage varies by the saved-objects code path the conflict crossed,
 *      so both message and statusCode are checked.
 *   2. The data-views plugin's `DuplicateDataViewError` — `createSavedObject`
 *      runs a `findByName` dupe check before the create, and when the other
 *      node's SO has already landed it throws this instead of reaching ES.
 *      It's a plain `Error` with no `statusCode` and message
 *      `Duplicate data view: Case Analytics`, so it's matched by `name`.
 *
 * Both mean the same thing here (the space's view exists), so both are
 * treated as a benign, self-healing bootstrap race and logged at DEBUG.
 * Scoped to the bootstrap create call site so real version conflicts
 * elsewhere (e.g. a stale `updateSavedObject` payload) still surface.
 */
function isVersionConflictError(err: unknown): boolean {
  if (err == null) return false;
  if ((err as { name?: string })?.name === 'DuplicateDataViewError') return true;
  const status =
    (err as { statusCode?: number })?.statusCode ??
    (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
  if (status === 409) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /version_conflict_engine_exception|document already exists/i.test(message);
}

interface CasesAnalyticsV2DataViewServiceDeps {
  logger: Logger;
  dataViewsService: DataViewsServerPluginStart;
  /**
   * Internal (no-request) SO client used for template and field-library
   * reads. Both are hidden SO types, and the request-scoped client passed
   * at ensure time may not include them in `includedHiddenTypes`. The
   * internal client is opted in to `cases`, `cases-templates`, and
   * `cases-field-definitions` at plugin start.
   *
   * `namespaces: [spaceId]` on the find call scopes results to a single
   * space even though the client itself is unscoped.
   */
  internalSavedObjectsClient: SavedObjectsClientContract;
}

/**
 * Per-call dependencies for `ensureForSpace`. The request-scoped SO client
 * lands the data view in the request's space automatically, so no manual
 * namespace handling is needed.
 *
 * Templates are read via the internal SO client held by the service (rather
 * than the request-scoped client) because they're a hidden SO type the
 * request-scoped client may not opt into.
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
 * Subset of the template SO this service reads. `attributes.definition` is
 * the raw YAML the user submitted; it's parsed here (rather than reading the
 * denormalized `attributes.fieldDefinitions`) because `fieldDefinitions`
 * omits `$ref` library fields — `toFieldDefinitions` persists inline fields
 * only. Resolving the YAML against the field library instead recovers both
 * inline and `$ref` fields, matching the case write path
 * (`v2_template_utils.buildTemplateExtendedFieldsDefaults`).
 *
 * `attributes.owner` scopes `$ref` resolution to the template's owner:
 * library field names are unique only per owner, so refs must resolve
 * against that owner's library subset (see `collectTemplateSnakeKeys`).
 */
interface TemplateAttributesLike {
  definition?: unknown;
  owner?: unknown;
}

/**
 * Subset of the field-library SO this service reads. Unlike templates, a
 * field definition stores its field entry as a raw YAML string in
 * `attributes.definition`; the `{ name, type }` needed for a snake-key is
 * recovered by parsing that YAML. `attributes.name` is the library field's
 * identifier — it's what a template `$ref` points at, so it's needed to
 * resolve refs against this library. `attributes.owner` scopes that
 * resolution, since library names are unique only per owner.
 *
 * `isGlobal` is read from `_source` and filtered in application code — the
 * boolean isn't reliably indexed for documents created before the mapping
 * existed, mirroring `FieldDefinitionsService.getFieldDefinitions`.
 */
interface FieldDefinitionAttributesLike {
  name?: unknown;
  definition?: unknown;
  owner?: unknown;
  isGlobal?: unknown;
}

/**
 * Tracks a successful ensure for a single space.
 *
 * - `ensuredAt` drives the TTL guard against out-of-band data view
 *   deletion: entries past the TTL re-run the full ensure path.
 * - `fingerprint` is the digest of the snake-keys collected at the last
 *   successful ensure. When a subsequent ensure recomputes the same
 *   fingerprint within the TTL, the data view fetch + `isEqual` diff is
 *   skipped.
 *
 * Both fields are written together inside `ensureOrRefreshForSpace` and
 * read together by the cache check; treating them as a unit avoids
 * partial-state confusion.
 */
interface BootstrapEntry {
  ensuredAt: number;
  fingerprint: string;
}

/**
 * Manages per-space Cases data views. One data view per space, each
 * carrying a runtime field map derived from that space's templates and
 * its global field-library fields (`isGlobal: true`).
 *
 * Lazy bootstrap: a space's data view is created on the first Cases
 * request in that space; subsequent in-process requests short-circuit via
 * the bootstrap cache, so tenants with thousands of unused spaces pay
 * nothing until usage.
 *
 * Runtime fields rather than mapped fields. Extended-field values land as
 * keywords under `case.extended_fields.<snake>`; the data view publishes
 * a typed runtime field at `case.<snake>` that parses at query time. See
 * `runtime_fields.ts` for the snake-key → Painless transform.
 *
 * Template change → data view propagation:
 *   1. Template SO lifecycle hook (templates service) calls
 *      `refreshForSpace` after every create / update / delete.
 *      Fire-and-forget; the next access path repairs on failure.
 *   2. Kibana restart leaves the cache empty; `ensureForSpace` recomputes
 *      the desired map and diffs against the persisted data view.
 *   3. Administrator `/reset` drops all per-space data views and clears
 *      the cache.
 *
 * Failure policy: never throws past the service boundary. Bootstrap
 * failures log at WARN; users in an affected space see "no data view
 * found" in Lens until the next refresh path resolves.
 */
export class CasesAnalyticsV2DataViewService {
  private readonly logger: Logger;
  private readonly deps: CasesAnalyticsV2DataViewServiceDeps;
  /**
   * Process-local cache of bootstrapped spaces. Entries older than
   * `BOOTSTRAP_CACHE_TTL_MS` re-run the full ensure path on the next
   * request, which is the only recovery from out-of-band data view
   * deletion (admin UI, scripts) short of process restart or `/reset`.
   * Each entry carries the snake-key fingerprint from its last successful
   * ensure so within-TTL refreshes can skip the data view fetch + diff
   * when the desired state is unchanged. Cleared on plugin start; `/reset`
   * also clears it.
   */
  private readonly bootstrappedSpaces = new Map<string, BootstrapEntry>();

  /**
   * In-flight ensures, keyed by space id. Concurrent requests for the same
   * space — the cold-start window before the cache is populated — collapse
   * onto the first ensure's promise instead of racing into `createAndSave`
   * and surfacing `version_conflict_engine_exception` on the deterministic
   * data view id.
   *
   * Cross-Kibana-node races (two nodes in the same cluster bootstrapping
   * the same space at once) can't be deduped from a single process; the
   * `createAndSave` call site tolerates a 409 from that race separately.
   */
  private readonly inflightEnsures = new Map<string, Promise<void>>();

  constructor(deps: CasesAnalyticsV2DataViewServiceDeps) {
    this.logger = deps.logger.get('dataView');
    this.deps = deps;
  }

  /**
   * Test-only seam, overridden in `service.test.ts` to make TTL behaviour
   * deterministic without `jest.useFakeTimers()` (which would interfere
   * with the data view service's own internal timers).
   */
  protected now(): number {
    return Date.now();
  }

  /**
   * Ensures the Cases data view exists in the given space and that its
   * runtime field map matches the union of that space's templates.
   * Idempotent: in-process repeats hit the bootstrap cache after the first
   * success.
   *
   * The desired runtime field map is computed before branching so all
   * branches compare like for like:
   *   - missing → create with the freshly-computed map;
   *   - exists, map matches → no-op;
   *   - exists, map differs → update in place.
   * This is what lets a Kibana restart refresh stale fields without
   * waiting for `/reset`.
   *
   * Fire-and-forget: errors are caught internally and logged at WARN.
   */
  public async ensureForSpace(deps: EnsureForSpaceDeps): Promise<void> {
    const cached = this.bootstrappedSpaces.get(deps.spaceId);
    if (cached != null && this.now() - cached.ensuredAt < BOOTSTRAP_CACHE_TTL_MS) return;
    if (cached != null) {
      // TTL elapsed — log so support cases ("user reports no data view")
      // can confirm the next request re-checked instead of trusting a
      // stale cache. Cold-start (cached == null) is intentionally silent.
      this.logger.debug(
        `bootstrap cache expired for space=${
          deps.spaceId
        }; re-running ensure (cache TTL ${BOOTSTRAP_CACHE_TTL_MS}ms exceeded by ${
          this.now() - cached.ensuredAt - BOOTSTRAP_CACHE_TTL_MS
        }ms)`
      );
    }
    await this.dedupedEnsure(deps);
  }

  /**
   * Force-refresh path used by template lifecycle hooks. Runs the same
   * compute + diff + update flow as `ensureForSpace`, but bypasses the
   * in-memory bootstrap cache so a template create / update / delete in a
   * space that has already been ensured this process actually re-runs the
   * diff.
   *
   * Fire-and-forget like `ensureForSpace`.
   */
  public async refreshForSpace(deps: EnsureForSpaceDeps): Promise<void> {
    await this.dedupedEnsure(deps);
  }

  /**
   * Collapses concurrent ensures for the same space onto a single in-flight
   * promise. The deterministic data view id means two parallel
   * `createAndSave` calls would race into `version_conflict_engine_exception`;
   * a `Map<spaceId, Promise>` keyed dedupe makes that race impossible
   * within a single Kibana process.
   *
   * The `finally` clears the slot only if it still holds the same promise
   * a later overlapping call may have replaced it. The replacement is
   * harmless; the guard prevents clobbering a fresh in-flight ensure.
   */
  private async dedupedEnsure(deps: EnsureForSpaceDeps): Promise<void> {
    const existing = this.inflightEnsures.get(deps.spaceId);
    if (existing != null) {
      await existing;
      return;
    }
    const promise = this.ensureOrRefreshForSpace(deps).finally(() => {
      if (this.inflightEnsures.get(deps.spaceId) === promise) {
        this.inflightEnsures.delete(deps.spaceId);
      }
    });
    this.inflightEnsures.set(deps.spaceId, promise);
    await promise;
  }

  /**
   * Shared body for `ensureForSpace` and `refreshForSpace`. The two paths
   * differ only in whether the bootstrap cache short-circuit runs ahead of
   * this call; once inside, the work is identical.
   */
  private async ensureOrRefreshForSpace(deps: EnsureForSpaceDeps): Promise<void> {
    try {
      const dataViewId = getCaseDataViewId(deps.spaceId);

      // Compute the snake-key fingerprint before fetching the data view.
      // If it matches the last successful ensure on this node AND the
      // cached entry is still within the TTL window, the data view fetch
      // and `isEqual` diff are skipped. This is the hot path during
      // template-edit bursts (most edits — name, tags, validation — don't
      // change snake-keys).
      //
      // The freshness gate is what preserves recovery from out-of-band
      // data view deletion: an admin can delete a per-space data view via
      // Stack Management without touching templates, leaving snake-keys
      // unchanged. Past the TTL the shortcut is skipped so the next
      // ensure re-verifies existence via `getDataViewIfExists`. The outer
      // `ensureForSpace` guard already returns inside the TTL window, so
      // this shortcut only ever fires on the `refreshForSpace` path that
      // intentionally bypasses the outer guard.
      const snakeKeys = await this.collectSnakeKeysForSpace(deps.spaceId);
      const fingerprint = computeRuntimeFieldsFingerprint(snakeKeys);
      const cached = this.bootstrappedSpaces.get(deps.spaceId);
      if (
        cached?.fingerprint === fingerprint &&
        this.now() - cached.ensuredAt < BOOTSTRAP_CACHE_TTL_MS
      ) {
        // Templates unchanged and the cached entry is still trusted; just
        // refresh the timestamp so the TTL window restarts.
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

        // Deliberately NOT `createAndSave`: that helper unconditionally
        // calls `setDefault`, which claims the space's global default data
        // view slot for the first view created when none is set yet
        // (`setDefault(id, force=false)` only writes when there's no default).
        // This is a fire-and-forget bootstrap that runs on the first cases
        // request in a space, so it would race ahead of an admin's or a
        // test's own data view and silently make the managed "Case Analytics"
        // view the default — surfacing as the wrong pre-selected view in the
        // Discover/Lens picker across unrelated surfaces. A managed,
        // admin-facing analytics view is always selected explicitly, so it
        // must never touch the default. `create` + `createSavedObject`
        // reproduce `createAndSave` minus the `setDefault` side effect.
        //
        // `skipFetchFields: true` matches the previous `createAndSave` call;
        // runtime fields come from the spec, not a field-caps refresh.
        //
        // `overwrite: false` so a concurrent create from another node
        // surfaces a conflict instead of clobbering. Per-process concurrency
        // is already collapsed by `dedupedEnsure`, so the only remaining
        // source of a conflict is a cross-Kibana-node race: another node
        // ensured the same space at the same time and won the SO create.
        // Depending on which node's write lands first the loser sees either
        // an ES `version_conflict_engine_exception` (the SO create raced) or
        // the data-views plugin's `DuplicateDataViewError` (the loser's
        // `createSavedObject` name check saw the winner's doc first);
        // `isVersionConflictError` treats both as the same benign outcome.
        // Both nodes computed the desired map from the same `find` against
        // the persisted templates, so the winning doc carries the runtime
        // fields this call would have written. Treat as a benign success
        // and let the next refresh path (template lifecycle hook or the
        // post-TTL recompute) reconcile if anything drifts.
        try {
          const dataView = await dvService.create(spec, true /* skipFetchFields */);
          await dvService.createSavedObject(dataView, false /* overwrite */);
          this.logger.info(
            `bootstrapped data view ${dataViewId} (space=${deps.spaceId}, runtime_fields=${
              Object.keys(desiredRuntimeFieldMap).length
            })`
          );
        } catch (err) {
          if (!isVersionConflictError(err)) throw err;
          this.logger.debug(
            `data view ${dataViewId} (space=${deps.spaceId}) already created by another Kibana node; treating as bootstrapped`
          );
        }
      } else {
        // `toSpec()` clones internal state, so reading it doesn't mutate
        // the cached DataView.
        const currentRuntimeFieldMap = existing.toSpec().runtimeFieldMap ?? {};
        if (!isEqual(currentRuntimeFieldMap, desiredRuntimeFieldMap)) {
          // `RuntimeFieldSpec` is structurally compatible with `RuntimeField`
          // for the `(type + script)` entries this surface produces; the cast
          // crosses the public/private contract boundary without adding any
          // fields. `replaceAllRuntimeFields` strips field-attribute metadata
          // internally, so a round-trip through `toSpec()` returns the same
          // shape that was written.
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
   * Returns the data view if present, `null` if not found. Any other
   * failure propagates to the caller's try/catch.
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
      // Some `dvService.get` failure paths surface as
      // `Error('Saved object [...] not found')` with no status code; fall
      // back to a message check so real failures aren't misclassified as
      // not-found.
      const message = err instanceof Error ? err.message : String(err);
      if (/not\s+found/i.test(message)) return null;
      throw err;
    }
  }

  /**
   * Clears the in-memory bootstrapped-spaces cache so the next request in
   * each space re-checks and recreates if needed. Called from `/reset`
   * after the underlying data view SOs are deleted; without this the
   * cache would keep claiming "bootstrapped" until process restart.
   */
  public clearBootstrapCache(): void {
    this.bootstrappedSpaces.clear();
  }

  // ----- Internals -----

  /**
   * Collects the `<name>_as_<type>` snake-keys that the per-space data view
   * must project as runtime fields. Two sources feed this set, both of
   * which land their values in `case.extended_fields`:
   *   1. Template fields — every live template's resolved field set, inline
   *      fields plus `$ref` library fields (see `collectTemplateSnakeKeys`).
   *   2. Global field-library fields (`isGlobal: true`) — applied to every
   *      case regardless of template, so their runtime fields must be
   *      published even when no template references them (see
   *      `collectGlobalFieldSnakeKeys`).
   *
   * The field library is loaded once and shared: templates resolve their
   * `$ref` fields against it, and global fields are filtered out of it. The
   * resulting lists are concatenated; `buildRuntimeFieldMap` dedupes
   * identical snake-keys, so a field a template references via `$ref` and a
   * global field pointing at the same library entry collapse to one runtime
   * field.
   */
  private async collectSnakeKeysForSpace(spaceId: string): Promise<string[]> {
    // Both `cases-templates` and `cases-field-definitions` are always
    // registered with core, so the reads below are always safe. When the
    // templates feature is off there simply are no template or field-library
    // documents, so both collectors return empty and the data view is
    // bootstrapped with no runtime field overlay.
    //
    // The field library is needed twice — to resolve template `$ref` fields
    // and to project global fields — so it's loaded once and passed to both
    // collectors.
    const fieldLibrary = await this.collectFieldLibrary(spaceId);

    // Group by owner for `$ref` resolution. Library field names are unique
    // only per owner, so a template must resolve refs against its own
    // owner's subset — matching the owner-scoped resolution the case write
    // path uses (`getFieldDefinitions({ owner })`). Resolving against the
    // merged space-wide library could pick another owner's same-named field
    // with a different type, producing a snake-key that never matches the
    // stored value.
    const libraryByOwner = new Map<string, FieldDefinition[]>();
    for (const def of fieldLibrary) {
      const forOwner = libraryByOwner.get(def.owner);
      if (forOwner) {
        forOwner.push(def);
      } else {
        libraryByOwner.set(def.owner, [def]);
      }
    }

    const templateSnakeKeys = await this.collectTemplateSnakeKeys(spaceId, libraryByOwner);
    const globalFieldSnakeKeys = this.collectGlobalFieldSnakeKeys(fieldLibrary);

    return [...templateSnakeKeys, ...globalFieldSnakeKeys];
  }

  /**
   * Pages through every field-library SO in the given space and returns the
   * ones with a string `definition`, shaped as `FieldDefinition`s for the
   * shared parser / resolver utilities.
   *
   * Reads `attributes.name` (what a template `$ref` points at, see
   * `resolveTemplateFields`), `attributes.owner` (so `$ref` resolution can
   * be scoped per owner — library names are unique only per owner), and
   * `attributes.isGlobal` (so `collectGlobalFieldSnakeKeys` can filter
   * without a second SO read).
   *
   * Uses the internal SO client because the field-library type is hidden and
   * the request-scoped client may not include it.
   */
  private async collectFieldLibrary(spaceId: string): Promise<FieldDefinition[]> {
    const library: FieldDefinition[] = [];
    let page = 1;

    while (true) {
      const response =
        await this.deps.internalSavedObjectsClient.find<FieldDefinitionAttributesLike>({
          type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
          perPage: FIELD_DEFINITIONS_PAGE_SIZE,
          page,
          // Single-space scope: this view's runtime fields cover only the
          // field library in this space (across every owner in it).
          namespaces: [spaceId],
          fields: ['name', 'owner', 'definition', 'isGlobal'],
        });

      const defs = response.saved_objects
        .filter((fd) => typeof fd.attributes?.definition === 'string')
        .map((fd) => ({
          fieldDefinitionId: fd.id,
          name: typeof fd.attributes?.name === 'string' ? fd.attributes.name : '',
          owner: typeof fd.attributes?.owner === 'string' ? fd.attributes.owner : '',
          definition: fd.attributes.definition as string,
          isGlobal: fd.attributes?.isGlobal === true,
        }));
      library.push(...defs);

      if (response.saved_objects.length < FIELD_DEFINITIONS_PAGE_SIZE) break;
      page++;
    }

    return library;
  }

  /**
   * Pages through every active template SO in the given space and derives
   * `<name>_as_<type>` snake-keys from each template's resolved field set.
   *
   * Reads `attributes.definition` (the raw YAML) rather than the
   * denormalized `attributes.fieldDefinitions`: the latter is produced by
   * `toFieldDefinitions`, which persists inline fields only and drops
   * `$ref` library references. Parsing the YAML and resolving it against the
   * field library (`resolveTemplateFields`) recovers both inline and `$ref`
   * fields — the same resolution the case write path uses to compute
   * `extended_fields`, so the runtime fields match the values actually
   * stored. Display-only fields (MARKDOWN) hold no value and are excluded.
   *
   * `$ref` fields resolve against the template owner's library subset
   * (`libraryByOwner`), not the merged space-wide library: library names are
   * unique only per owner, so a space-wide `.find` by name could bind a ref
   * to another owner's same-named field with a different type. `attributes.owner`
   * is read for this scoping.
   *
   * Uses the internal SO client because templates are a hidden type the
   * request-scoped client may not include.
   *
   * Filters match the templates service's definition of "live":
   *   - `isLatest: true` excludes old versions that a renamed template no
   *     longer publishes.
   *   - `NOT deletedAt: *` excludes soft-deleted templates.
   * `fields: ['definition', 'owner']` keeps the payload limited to the only
   * attributes this method reads. The SO API skips migrations for
   * partial-field reads, which is safe here because the filter fields,
   * `definition`, and `owner` have all been on the template SO since its
   * first model version.
   */
  private async collectTemplateSnakeKeys(
    spaceId: string,
    libraryByOwner: ReadonlyMap<string, FieldDefinition[]>
  ): Promise<string[]> {
    const out: string[] = [];
    let page = 1;

    while (true) {
      const response = await this.deps.internalSavedObjectsClient.find<TemplateAttributesLike>({
        type: CASE_TEMPLATE_SAVED_OBJECT,
        perPage: TEMPLATES_PAGE_SIZE,
        page,
        // Single-space scope: runtime fields for this view are derived
        // only from templates in this space.
        namespaces: [spaceId],
        filter: `${CASE_TEMPLATE_SAVED_OBJECT}.attributes.isLatest: true AND NOT ${CASE_TEMPLATE_SAVED_OBJECT}.attributes.deletedAt: *`,
        fields: ['definition', 'owner'],
      });

      for (const tpl of response.saved_objects) {
        const owner = typeof tpl.attributes?.owner === 'string' ? tpl.attributes.owner : '';
        // Resolve refs only against this owner's library. An unknown owner
        // (no entry) resolves against an empty library — inline fields still
        // project; refs drop, which is safe.
        const ownerLibrary = libraryByOwner.get(owner) ?? [];
        const snakeKeys = this.resolveTemplateFieldsFromDefinition(
          tpl.attributes?.definition,
          ownerLibrary
        )
          // Display-only fields (MARKDOWN) hold no value and are never
          // stored on a case, so they get no runtime field.
          .filter((field) => !isDisplayOnlyField(field))
          .map((field) => getFieldSnakeKey(field.name, field.type));
        out.push(...snakeKeys);
      }

      if (response.saved_objects.length < TEMPLATES_PAGE_SIZE) break;
      page++;
    }

    return out;
  }

  /**
   * Parses a template's raw YAML `definition` and resolves its `fields`
   * (inline + `$ref`) against the field library into a flat inline-field
   * list. A malformed or non-string definition yields an empty list — a
   * single bad template must never break runtime field projection for the
   * rest of the space.
   */
  private resolveTemplateFieldsFromDefinition(
    definition: unknown,
    fieldLibrary: readonly FieldDefinition[]
  ): InlineField[] {
    if (typeof definition !== 'string') return [];
    try {
      const parsed = ParsedTemplateDefinitionSchema.safeParse(parseYaml(definition));
      if (!parsed.success) return [];
      return resolveTemplateFields(parsed.data.fields, fieldLibrary);
    } catch {
      return [];
    }
  }

  /**
   * Derives `<name>_as_<type>` snake-keys from the global (`isGlobal: true`)
   * entries of the already-loaded field library. Global fields apply to
   * every case regardless of template, so their values land in
   * `case.extended_fields` even when the case uses no template — without
   * this projection those values would sit in the analytics index untyped
   * and undiscoverable in Lens / Discover.
   *
   * Display-only fields (MARKDOWN) hold no value and are never stored on a
   * case, so they're excluded to match the write path
   * (`buildExtendedFieldsDefaults`).
   */
  private collectGlobalFieldSnakeKeys(fieldLibrary: readonly FieldDefinition[]): string[] {
    const globalDefinitions = fieldLibrary.filter((fd) => fd.isGlobal === true);
    return parseFieldDefinitionsToInlineFields(globalDefinitions)
      .filter((field) => !isDisplayOnlyField(field))
      .map((field) => getFieldSnakeKey(field.name, field.type));
  }

  private buildRuntimeFieldMap(snakeKeys: string[]): Record<string, RuntimeFieldSpec> {
    const map: Record<string, RuntimeFieldSpec> = {};
    for (const snakeKey of snakeKeys) {
      const entry = buildRuntimeFieldEntry(snakeKey);
      // The `<name>_as_<type>` suffix is intentional. Different solutions
      // in the same space can store a logically-shared field name under
      // different physical types (e.g. `classification_as_keyword` and
      // `classification_as_long`) and coexist as distinct runtime fields
      // with no collision. Two templates declaring the identical
      // `<name>_as_<type>` produce identical entries and map insertion is
      // idempotent. Cross-space collisions can't happen because each space
      // has its own map.
      if (entry != null) {
        map[entry.fieldName] = entry.spec;
      }
    }
    return map;
  }
}
