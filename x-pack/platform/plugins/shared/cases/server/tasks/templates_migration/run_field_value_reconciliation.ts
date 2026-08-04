/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ISavedObjectsRepository, Logger, SavedObject } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { CASE_CONFIGURE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import type { CasePersistedAttributes } from '../../common/types/case';
import {
  buildFieldLinkIndexes,
  resolveDefinitionForLegacyField,
} from '../../common/utils/field_link_resolution';
import {
  areFieldRepresentationsEqual,
  decodeStorageFieldValue,
  encodeLegacyFieldValue,
} from '../../common/utils/field_value_codecs';
import type { LegacyFieldValue } from '../../common/utils/field_value_codecs';
import { computeActiveLinkFingerprint } from './link_fingerprint';
import { findFieldDefinitionsForOwner } from './migrate_configuration';
import {
  CASE_BACKFILL_PAGE_SIZE,
  CASE_BACKFILL_PIT_KEEP_ALIVE,
  MAX_RECONCILE_DIAGNOSTICS_PER_SPACE,
  RECONCILE_SCAN_BUDGET,
} from './types';
import type {
  ReconcileCounts,
  ReconcileCursor,
  ReconcilePhaseResult,
  SpaceReconcileResult,
} from './types';

/**
 * Field-value reconciliation phase (plan Unit 2 §7, addenda A1/A3/A5): verifies
 * — and, under the approved precedence rule, repairs — semantic parity between
 * every existing case's linked v1 `customFields` and v2 `extended_fields`
 * values, then writes the space's `legacyFieldValuesReconciled` marker.
 *
 * Approved precedence per actively linked field:
 * - v2 present, v1 missing → populate v1 from v2 (decoded);
 * - v1 present, v2 missing → populate v2 from v1 (encoded);
 * - both semantically equal (including both empty) → no-op;
 * - both present and different → v2 wins and is decoded back into v1.
 *
 * Repairs are RAW Saved Object updates: the case-domain `attributes.updated_at`
 * and `attributes.updated_by` are untouched so the Cases UI ordering does not
 * change, no user action is emitted (the task corrects duplicate storage, not a
 * user decision), and no workflow trigger events fire. Updates are
 * version-aware (OCC): a case changed concurrently fails with a retryable
 * conflict and the space restarts from a fresh snapshot on a later run.
 */

type PersistedCustomField = NonNullable<CasePersistedAttributes['customFields']>[number];

interface ActiveReconcileLink {
  key: string;
  type: string;
  storageKey: string;
  definitionId: string;
}

/** Content-free operator diagnostic (A5): ids and categories only, never values. */
interface ReconcileDiagnostic {
  category:
    | 'duplicate_v1_entries'
    | 'undecodable_v2_value'
    | 'unencodable_v1_value'
    | 'non_string_v2_value'
    | 'unresolved_configured_field'
    | 'malformed_field_linkage';
  caseId?: string;
  definitionId?: string;
  legacyKey: string;
}

interface SpaceLinkAnalysis {
  activeLinks: ActiveReconcileLink[];
  /** Configured v1 fields whose link is unresolved or malformed — block completion (A1/A4). */
  blockedFieldDiagnostics: ReconcileDiagnostic[];
  /** Definitions with a `legacyKey` no longer configured — counted, never touched. */
  inactiveHistoricalLinks: number;
  fingerprint: string;
}

const emptyCounts = (): ReconcileCounts => ({
  scanned: 0,
  mismatched: 0,
  repaired: 0,
  conflicted: 0,
  malformed: 0,
  completed: 0,
});

const addCounts = (into: ReconcileCounts, from: ReconcileCounts): void => {
  into.scanned += from.scanned;
  into.mismatched += from.mismatched;
  into.repaired += from.repaired;
  into.conflicted += from.conflicted;
  into.malformed += from.malformed;
  into.completed += from.completed;
};

/**
 * Resolves the space's configured v1 fields against its current definitions.
 * One bounded definitions fetch per space per run; everything else is in
 * memory. The returned fingerprint is the staleness anchor for cursors and the
 * completion marker (A3).
 */
const analyzeSpaceLinks = async (
  repo: ISavedObjectsRepository,
  so: SavedObject<ConfigurationPersistedAttributes>,
  nsOption: string | undefined
): Promise<SpaceLinkAnalysis> => {
  const { owner } = so.attributes;
  const configuredFields = (so.attributes.customFields ?? []).map(({ key, type }) => ({
    key,
    type,
  }));

  const definitions = await findFieldDefinitionsForOwner(repo, owner, nsOption);
  const indexes = buildFieldLinkIndexes(definitions);
  const fingerprint = computeActiveLinkFingerprint(configuredFields, indexes);

  const activeLinks: ActiveReconcileLink[] = [];
  const blockedFieldDiagnostics: ReconcileDiagnostic[] = [];

  for (const configuredField of configuredFields) {
    const resolution = resolveDefinitionForLegacyField(configuredField, indexes);
    if (resolution.status === 'resolved') {
      activeLinks.push({
        key: configuredField.key,
        type: configuredField.type,
        storageKey: resolution.storageKey,
        definitionId: resolution.link.definition.fieldDefinitionId,
      });
    } else {
      blockedFieldDiagnostics.push({
        category:
          resolution.status === 'malformed'
            ? 'malformed_field_linkage'
            : 'unresolved_configured_field',
        legacyKey: configuredField.key,
      });
    }
  }

  const configuredKeys = new Set(configuredFields.map(({ key }) => key));
  const inactiveHistoricalLinks = definitions.filter(
    ({ attributes }) =>
      attributes.legacyKey !== undefined && !configuredKeys.has(attributes.legacyKey)
  ).length;

  return { activeLinks, blockedFieldDiagnostics, inactiveHistoricalLinks, fingerprint };
};

interface CaseReconcileOutcome {
  /** Only the attributes that changed; undefined when the case is consistent. */
  changes?: Partial<Pick<CasePersistedAttributes, 'customFields' | 'extended_fields'>>;
  mismatched: boolean;
  conflicted: number;
  diagnostics: ReconcileDiagnostic[];
}

/**
 * Applies the approved precedence rule to one case, in memory. Pure and
 * idempotent: reconciling an already-consistent case returns no changes, which
 * is what makes a fresh-snapshot restart after conflicts safe.
 */
export const reconcileCaseFields = (
  caseId: string,
  attributes: CasePersistedAttributes,
  activeLinks: ActiveReconcileLink[]
): CaseReconcileOutcome => {
  const outcome: CaseReconcileOutcome = { mismatched: false, conflicted: 0, diagnostics: [] };
  let customFields = attributes.customFields ?? [];
  let extendedFields = attributes.extended_fields ?? {};
  let customFieldsChanged = false;
  let extendedFieldsChanged = false;

  const upsertV1 = (link: ActiveReconcileLink, value: PersistedCustomField['value']): void => {
    const index = customFields.findIndex((cf) => cf.key === link.key);
    const entry: PersistedCustomField = { key: link.key, type: link.type, value };
    customFields =
      index === -1
        ? [...customFields, entry]
        : [...customFields.slice(0, index), entry, ...customFields.slice(index + 1)];
    customFieldsChanged = true;
  };

  const diagnose = (category: ReconcileDiagnostic['category'], link: ActiveReconcileLink): void => {
    outcome.diagnostics.push({
      category,
      caseId,
      definitionId: link.definitionId,
      legacyKey: link.key,
    });
  };

  const reconcileOneLink = (link: ActiveReconcileLink): void => {
    const v1Entries = (attributes.customFields ?? []).filter((cf) => cf.key === link.key);
    if (v1Entries.length > 1) {
      // Historical duplicates for one linked key are ambiguous — array order is
      // not a precedence rule (A5). Diagnose and leave the field untouched.
      diagnose('duplicate_v1_entries', link);
      return;
    }

    const v1Value = (v1Entries[0]?.value ?? null) as LegacyFieldValue;
    const rawV2 = (attributes.extended_fields ?? {})[link.storageKey];
    if (rawV2 !== undefined && typeof rawV2 !== 'string') {
      diagnose('non_string_v2_value', link);
      return;
    }

    if (areFieldRepresentationsEqual(link.type, v1Value, rawV2)) {
      return;
    }
    outcome.mismatched = true;

    const v2Empty = rawV2 === undefined || rawV2 === '';
    if (!v2Empty) {
      // v2 present: v2 wins (covers both "v1 missing" and "both differ").
      const decoded = decodeStorageFieldValue(link.type, rawV2);
      if (!decoded.ok) {
        diagnose('undecodable_v2_value', link);
        return;
      }
      if (v1Value !== null) {
        outcome.conflicted++;
      }
      upsertV1(link, decoded.value);
      return;
    }

    // v1 present, v2 missing: populate v2 from v1.
    const encoded = encodeLegacyFieldValue(link.type, v1Value as NonNullable<LegacyFieldValue>);
    if (!encoded.ok) {
      diagnose('unencodable_v1_value', link);
      return;
    }
    extendedFields = { ...extendedFields, [link.storageKey]: encoded.value };
    extendedFieldsChanged = true;
  };

  activeLinks.forEach(reconcileOneLink);

  if (customFieldsChanged || extendedFieldsChanged) {
    outcome.changes = {
      ...(customFieldsChanged ? { customFields } : {}),
      ...(extendedFieldsChanged
        ? { extended_fields: extendedFields as Record<string, string> }
        : {}),
    };
  }

  return outcome;
};

/** Best-effort PIT close — an already-expired PIT lapses on its own. */
const safeClosePit = async (
  repo: ISavedObjectsRepository,
  pitId: string,
  log: Logger
): Promise<void> => {
  try {
    await repo.closePointInTime(pitId);
  } catch (err) {
    log.debug(
      `Failed to close reconciliation PIT: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};

const logDiagnostics = (
  diagnostics: ReconcileDiagnostic[],
  { owner, namespace, executionId, log }: SpaceContext
): void => {
  const shown = diagnostics.slice(0, MAX_RECONCILE_DIAGNOSTICS_PER_SPACE);
  for (const diagnostic of shown) {
    // Content-free by contract (A5): ids and categories only — never field
    // values, labels, or case titles.
    log.warn(
      `[${executionId}] reconciliation diagnostic: category="${diagnostic.category}"` +
        `${diagnostic.caseId ? ` caseId="${diagnostic.caseId}"` : ''}` +
        `${diagnostic.definitionId ? ` definitionId="${diagnostic.definitionId}"` : ''}` +
        ` legacyKey="${diagnostic.legacyKey}" owner="${owner}" namespace="${namespace}"`
    );
  }
  if (diagnostics.length > shown.length) {
    log.warn(
      `[${executionId}] reconciliation diagnostics truncated: ${
        diagnostics.length - shown.length
      } more for owner "${owner}" (namespace: ${namespace})`
    );
  }
};

interface SpaceContext {
  owner: string;
  namespace: string;
  executionId: string;
  log: Logger;
}

/**
 * OCC completion check (A3): re-fetches the configure SO and the definitions
 * fresh, recomputes the fingerprint, and writes the marker only when it still
 * matches the fingerprint the verification scan ran under. Any drift (or a
 * version conflict on the write) means the links changed — the space is left
 * unmarked and rescanned on a later run instead of being marked complete.
 */
const tryMarkSpaceReconciled = async (
  repo: ISavedObjectsRepository,
  configureId: string,
  nsOption: string | undefined,
  scannedFingerprint: string,
  { owner, namespace, executionId, log }: SpaceContext
): Promise<boolean> => {
  const fresh = await repo.get<ConfigurationPersistedAttributes>(
    CASE_CONFIGURE_SAVED_OBJECT,
    configureId,
    nsOption ? { namespace: nsOption } : {}
  );
  const analysis = await analyzeSpaceLinks(repo, fresh, nsOption);

  if (analysis.fingerprint !== scannedFingerprint) {
    log.info(
      `[${executionId}] reconciliation fingerprint changed for owner "${owner}" (namespace: ` +
        `${namespace}) before completion — restarting instead of marking complete`
    );
    return false;
  }

  try {
    await repo.update<ConfigurationPersistedAttributes>(
      CASE_CONFIGURE_SAVED_OBJECT,
      configureId,
      {
        legacyFieldValuesReconciled: {
          at: new Date().toISOString(),
          linkFingerprint: scannedFingerprint,
        },
      },
      {
        version: fresh.version,
        ...(nsOption ? { namespace: nsOption } : {}),
        refresh: false,
      }
    );
    return true;
  } catch (err) {
    // A concurrent configure write raced the marker — the durable stale state
    // reschedules the space; never mark through a conflict.
    log.warn(
      `[${executionId}] reconciliation completion write conflicted for owner "${owner}" ` +
        `(namespace: ${namespace}); the space will be re-verified on a later run: ${
          err instanceof Error ? err.message : String(err)
        }`
    );
    return false;
  }
};

/**
 * Scans and repairs one space with the same PIT + `search_after` pattern as the
 * case backfill (see `run_case_backfill.ts` for the namespace and sort-order
 * gotchas — they apply identically here).
 */
const reconcileSpace = async (
  repo: ISavedObjectsRepository,
  so: SavedObject<ConfigurationPersistedAttributes>,
  resumeCursor: ReconcileCursor | undefined,
  scanBudget: number,
  signal: AbortSignal,
  executionId: string,
  log: Logger
): Promise<SpaceReconcileResult> => {
  const { owner } = so.attributes;
  const namespace = so.namespaces?.[0] ?? 'default';
  const nsOption = namespace === 'default' ? undefined : namespace;
  const namespaces = nsOption ? [nsOption] : ['default'];
  const context: SpaceContext = { owner, namespace, executionId, log };
  const counts = emptyCounts();

  const analysis = await analyzeSpaceLinks(repo, so, nsOption);

  // A resumed cursor from a different link set is stale — restart fresh (A3).
  let cursor = resumeCursor;
  if (cursor !== undefined && cursor.linkFingerprint !== analysis.fingerprint) {
    await safeClosePit(repo, cursor.pitId, log);
    cursor = undefined;
  }

  // Already verified under the current links — nothing to do. (A concurrent
  // instance may have marked the space while our cursor was persisted.)
  if (so.attributes.legacyFieldValuesReconciled?.linkFingerprint === analysis.fingerprint) {
    if (cursor !== undefined) {
      await safeClosePit(repo, cursor.pitId, log);
    }
    return { outcome: 'verified', counts };
  }

  logDiagnostics(analysis.blockedFieldDiagnostics, context);
  counts.malformed += analysis.blockedFieldDiagnostics.length;
  if (analysis.inactiveHistoricalLinks > 0) {
    log.debug(
      `[${executionId}] reconciliation: ${analysis.inactiveHistoricalLinks} inactive historical ` +
        `link(s) for owner "${owner}" (namespace: ${namespace}) left untouched`
    );
  }

  if (analysis.activeLinks.length === 0) {
    // Nothing reconcilable. With blocked fields the space stays incomplete
    // (A1); with no configured links at all it verifies trivially.
    if (analysis.blockedFieldDiagnostics.length > 0) {
      return { outcome: 'blocked', counts };
    }
    const marked = await tryMarkSpaceReconciled(
      repo,
      so.id,
      nsOption,
      analysis.fingerprint,
      context
    );
    if (marked) {
      counts.completed++;
    }
    return { outcome: marked ? 'verified' : 'stale', counts };
  }

  const openPit = async () =>
    (
      await repo.openPointInTimeForType(CASE_SAVED_OBJECT, {
        namespaces,
        keepAlive: CASE_BACKFILL_PIT_KEEP_ALIVE,
      })
    ).id;

  // Sequential scan loop — see run_case_backfill.ts for the identical pattern.
  /* eslint-disable require-atomic-updates */
  const scan: { pitId: string; searchAfter?: SortResults; reopenedStalePit: boolean } = {
    pitId: cursor?.pitId ?? (await openPit()),
    searchAfter: cursor?.pitId ? cursor.searchAfter : undefined,
    reopenedStalePit: false,
  };
  let hadRetryableFailures = false;
  let caseDiagnostics = 0;

  const makeCursor = (): ReconcileCursor => ({
    configureId: so.id,
    owner,
    namespace,
    nsOption,
    pitId: scan.pitId,
    searchAfter: scan.searchAfter,
    linkFingerprint: analysis.fingerprint,
  });

  const fetchPage = async () => {
    const findPage = () =>
      repo.find<CasePersistedAttributes>({
        type: CASE_SAVED_OBJECT,
        namespaces,
        perPage: CASE_BACKFILL_PAGE_SIZE,
        pit: { id: scan.pitId, keepAlive: CASE_BACKFILL_PIT_KEEP_ALIVE },
        ...(scan.searchAfter ? { searchAfter: scan.searchAfter } : {}),
        filter: `${CASE_SAVED_OBJECT}.attributes.owner: "${owner}"`,
      });

    try {
      return await findPage();
    } catch (err) {
      if (scan.reopenedStalePit) {
        await safeClosePit(repo, scan.pitId, log);
        throw err;
      }
      scan.reopenedStalePit = true;
      log.warn(
        `[${executionId}] reconciliation PIT invalid for owner "${owner}" (namespace: ${namespace}); reopening and rescanning the space`
      );
      scan.pitId = await openPit();
      scan.searchAfter = undefined;
      return findPage();
    }
  };

  while (true) {
    if (signal.aborted) {
      return { outcome: 'paused', counts, cursor: makeCursor() };
    }

    const page = await fetchPage();
    scan.pitId = page.pit_id ?? scan.pitId;
    const cases = page.saved_objects;
    counts.scanned += cases.length;

    const spaceDiagnostics: ReconcileDiagnostic[] = [];
    const updates = cases.flatMap((caseSO) => {
      const outcome = reconcileCaseFields(caseSO.id, caseSO.attributes, analysis.activeLinks);
      if (outcome.mismatched) {
        counts.mismatched++;
      }
      counts.conflicted += outcome.conflicted;
      counts.malformed += outcome.diagnostics.length;
      spaceDiagnostics.push(...outcome.diagnostics);
      if (outcome.changes === undefined) {
        return [];
      }
      return [
        {
          type: CASE_SAVED_OBJECT,
          id: caseSO.id,
          attributes: outcome.changes,
          // OCC: fail (retryably) instead of clobbering a concurrent case write.
          version: caseSO.version,
          ...(nsOption ? { namespace: nsOption } : {}),
        },
      ];
    });

    // Cap the per-case diagnostics across the whole space scan, not per page.
    const diagnosticsBudget = MAX_RECONCILE_DIAGNOSTICS_PER_SPACE - caseDiagnostics;
    if (spaceDiagnostics.length > 0 && diagnosticsBudget > 0) {
      logDiagnostics(spaceDiagnostics.slice(0, diagnosticsBudget), context);
    }
    caseDiagnostics += spaceDiagnostics.length;

    if (updates.length > 0) {
      const res = await repo.bulkUpdate<CasePersistedAttributes>(updates, { refresh: false });
      const failed = res.saved_objects.filter(isSavedObjectErrorResult);
      const notRetryable = failed.filter((s) => s.error?.statusCode === 404);
      const retryable = failed.filter((s) => s.error?.statusCode !== 404);
      if (notRetryable.length > 0) {
        log.warn(
          `[${executionId}] ${notRetryable.length}/${updates.length} reconciliation updates skipped ` +
            `(not found — won't retry) for owner "${owner}" (namespace: ${namespace})`
        );
      }
      if (retryable.length > 0) {
        hadRetryableFailures = true;
        log.error(
          `[${executionId}] ${retryable.length}/${updates.length} reconciliation updates failed ` +
            `(retryable) for owner "${owner}" (namespace: ${namespace}); the space will restart ` +
            `from a fresh snapshot on a later run`
        );
      }
      counts.repaired += updates.length - failed.length;
    }

    const lastSort = cases[cases.length - 1]?.sort;
    if (lastSort) {
      scan.searchAfter = lastSort;
    }

    if (cases.length < CASE_BACKFILL_PAGE_SIZE) {
      await safeClosePit(repo, scan.pitId, log);
      break;
    }

    if (counts.scanned >= scanBudget) {
      if (hadRetryableFailures) {
        // Restart the space fresh later rather than resuming a snapshot that
        // already diverged from the live index.
        await safeClosePit(repo, scan.pitId, log);
        return { outcome: 'failed', counts };
      }
      return { outcome: 'paused', counts, cursor: makeCursor() };
    }
  }
  /* eslint-enable require-atomic-updates */

  if (hadRetryableFailures) {
    return { outcome: 'failed', counts };
  }
  if (counts.malformed > 0) {
    // Permanently malformed data (or blocked configured links): completion is
    // blocked until an operator resolves the diagnosed documents (A5).
    return { outcome: 'blocked', counts };
  }
  if (counts.repaired > 0 || counts.mismatched > 0) {
    // Repairs were submitted this pass — a later pass must re-verify from a
    // fresh scan before the marker can be written (zero-mismatch verification).
    return { outcome: 'repaired', counts };
  }

  // Full scan with zero mismatches — this WAS the verification pass.
  const marked = await tryMarkSpaceReconciled(repo, so.id, nsOption, analysis.fingerprint, context);
  if (marked) {
    counts.completed++;
  }
  return { outcome: marked ? 'verified' : 'stale', counts };
};

/**
 * Whether a space may need field-value reconciliation: it has configured v1
 * custom fields, its one-time case backfill already completed (reconciliation
 * must never race the backfill's unversioned writes), and its stored marker is
 * absent — or MAY be stale, which only the per-space fingerprint computation
 * can decide (`reconcileSpace` exits cheaply when the fingerprint matches).
 */
const configureNeedsReconciliation = (so: SavedObject<ConfigurationPersistedAttributes>): boolean =>
  (so.attributes.customFields?.length ?? 0) > 0 && so.attributes.legacyCasesMigrated === true;

/**
 * Resumable reconciliation phase for one task run. Walks the spaces that may
 * need reconciliation (resuming the cursor's space first), spending at most
 * `RECONCILE_SCAN_BUDGET` scanned cases across the run. Blocked spaces are
 * terminal for this run (their durable missing marker retries them on the next
 * interval); failed/repaired spaces make the run incomplete so the task
 * reschedules sooner.
 */
export const runFieldValueReconciliationPhase = async (
  repo: ISavedObjectsRepository,
  configures: Array<SavedObject<ConfigurationPersistedAttributes>>,
  resumeCursor: ReconcileCursor | undefined,
  signal: AbortSignal,
  executionId: string,
  log: Logger
): Promise<ReconcilePhaseResult> => {
  const pending = configures.filter(configureNeedsReconciliation);
  const counts = emptyCounts();

  if (pending.length === 0) {
    return { complete: true, hadFailures: false, counts };
  }

  let ordered = pending;
  let cursor = resumeCursor;
  if (cursor) {
    const resumeConfigureId = cursor.configureId;
    const idx = pending.findIndex((so) => so.id === resumeConfigureId);
    if (idx > 0) {
      ordered = [pending[idx], ...pending.slice(0, idx), ...pending.slice(idx + 1)];
    } else if (idx < 0) {
      cursor = undefined;
    }
  }

  let hadFailures = false;
  let allTerminal = true;

  for (const so of ordered) {
    if (signal.aborted) {
      return { complete: false, hadFailures, counts, nextCursor: undefined };
    }

    const budgetLeft = RECONCILE_SCAN_BUDGET - counts.scanned;
    if (budgetLeft <= 0) {
      return { complete: false, hadFailures, counts, nextCursor: undefined };
    }

    const cursorForSpace = cursor?.configureId === so.id ? cursor : undefined;
    cursor = undefined;

    const result = await reconcileSpace(
      repo,
      so,
      cursorForSpace,
      budgetLeft,
      signal,
      executionId,
      log
    );
    addCounts(counts, result.counts);

    if (result.outcome === 'paused') {
      return { complete: false, hadFailures, counts, nextCursor: result.cursor };
    }
    if (result.outcome === 'failed') {
      hadFailures = true;
      allTerminal = false;
    } else if (result.outcome === 'repaired' || result.outcome === 'stale') {
      // More passes needed (re-verification or a fingerprint restart).
      allTerminal = false;
    }
    // 'verified' and 'blocked' are terminal for this run: verified spaces are
    // marked, blocked spaces wait for operator remediation and retry on the
    // next interval without making the run "incomplete" (no hot rescheduling).
  }

  return { complete: allTerminal, hadFailures, counts, nextCursor: undefined };
};
