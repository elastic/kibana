/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewPackagePolicyInput,
  PackagePolicyConfigRecord,
  NewPackagePolicyInputStream,
  PackageInfo,
  InputsOverride,
} from '../../common/types';
import type { NewPackagePolicy } from '../types';
import { varsReducer } from '../../common/services';

/**
 * Finds an input in `inputs` matching `type`, preferring a match on `policyTemplate`. Falls back
 * to an entry with no `policy_template` set to handle older stored policies where that field was
 * not reliably populated. Returns undefined when no match is found.
 */
export function findInputForMigration(
  inputs: NewPackagePolicyInput[],
  type: string,
  policyTemplate: string | undefined
): NewPackagePolicyInput | undefined {
  if (policyTemplate) {
    return (
      inputs.find((i) => i.type === type && i.policy_template === policyTemplate) ??
      inputs.find((i) => i.type === type && !i.policy_template)
    );
  }
  return inputs.find((i) => i.type === type);
}

/**
 * Applies input-level `migrate_from` migration when a new input type explicitly replaces an old
 * one.
 *
 * Mutates `update` in-place (merges vars, preserves the old input's enabled state) and removes the
 * now-stale old input from the mutable `inputs` array when it was not already pruned by the
 * policy-template filter above.
 *
 * Returns the source input that was migrated from, or undefined when no migration applies.
 */
export function applyInputLevelMigration(
  update: InputsOverride,
  allBaseInputs: NewPackagePolicyInput[],
  inputs: NewPackagePolicyInput[]
): NewPackagePolicyInput | undefined {
  if (update.migrate_from === undefined || update.deprecated) {
    return undefined;
  }

  const originalInputToMigrate = findInputForMigration(
    allBaseInputs,
    update.migrate_from,
    update.policy_template
  );
  if (!originalInputToMigrate) {
    return undefined;
  }

  // Ensure the old input doesn't linger in inputs when it has no policy_template
  // (inputs with a policy_template are already removed by the filter above)
  const foundStale = findInputForMigration(inputs, update.migrate_from, update.policy_template);
  const staleIdx = foundStale ? inputs.indexOf(foundStale) : -1;
  if (staleIdx !== -1) inputs.splice(staleIdx, 1);

  // Merge old input vars into the new input: seed with old values, keep new schema as the
  // authoritative list of vars, then strip any keys not present in the new schema.
  // deepMergeVars iterates over `update` (new schema) and restores non-null old values, so
  // null old values fall through to the new package defaults (see keepOriginalValue logic).
  const mergedInput = deepMergeVars(
    { ...update, vars: originalInputToMigrate.vars },
    update,
    true
  ) as InputsOverride;
  update.vars = sanitizeMigratedVars(removeStaleVars(mergedInput, update)).vars;
  // Preserve the enabled state of the old input rather than unconditionally enabling.
  update.enabled = originalInputToMigrate.enabled;

  return originalInputToMigrate;
}

/**
 * Merges vars from an old stream (and optionally its parent input's vars) into a new stream,
 * preserving the old stream's `enabled` state.
 *
 * Old input-level vars and old stream-level vars are combined before merging so that vars which
 * moved from input-level in the old input to stream-level in the new input are also carried over.
 * Stream-level vars take priority over input-level vars on collision.
 * `removeStaleVars` then discards any key not defined in the new stream schema.
 *
 * `oldStream` may be `undefined` when only input-level vars are available (e.g. the new input
 * has more streams than the old one). In that case `enabled` is left at the new stream's default.
 */
export function migrateStreamVars(
  newStream: InputsOverride,
  oldStream: NewPackagePolicyInputStream | undefined,
  oldInputVars: PackagePolicyConfigRecord | undefined
): NewPackagePolicyInputStream {
  // Combine old input-level vars with old stream-level vars. Stream-level vars take
  // priority over input-level vars for the same key (more specific value wins).
  // removeStaleVars below will then discard any key not defined in the new stream schema.
  const combinedOldVars: PackagePolicyConfigRecord = {
    ...(oldInputVars ?? {}),
    ...(oldStream?.vars ?? {}),
  };

  const merged = deepMergeVars(
    { ...newStream, vars: combinedOldVars },
    newStream as InputsOverride,
    true
  );
  // deepMergeVars only handles vars; explicitly carry the enabled state from
  // the old stream so the user's enable/disable choice is preserved.
  return sanitizeMigratedVars({
    ...removeStaleVars(merged, newStream),
    ...(oldStream ? { enabled: oldStream.enabled } : {}),
  });
}

/**
 * Applies stream-level `migrate_from` migration for a new input that has no matching existing
 * input in the current policy.
 *
 * Two sources of old streams are considered (in priority order):
 *  1. `originalInputToMigrate.streams` — when the parent input declared `migrate_from`, streams
 *     are matched positionally to the corresponding old input's streams.
 *  2. `newStream.migrate_from` — each stream can independently declare which old input type it
 *     migrates from, also matched positionally per source type.
 *
 * `update.streams` is replaced with the merged streams.
 * `update.enabled` is set from the old input's enabled state when stream-level migration occurred
 * without a corresponding input-level `migrate_from`.
 */
export function applyStreamLevelMigration(
  update: InputsOverride,
  originalInputToMigrate: NewPackagePolicyInput | undefined,
  allBaseInputs: NewPackagePolicyInput[]
): void {
  if (!update.streams || update.deprecated) {
    return;
  }

  const streamMigrateFromCounters: Record<string, number> = {};
  let streamMigrationOccurred = false;
  // Track the first old input encountered during stream-level migration so we can
  // carry its enabled state over to the new input.
  let oldInputForStreamMigration: NewPackagePolicyInput | undefined;

  update.streams = update.streams.map((newStream, idx) => {
    let oldStream: NewPackagePolicyInputStream | undefined;
    let oldInputVars: PackagePolicyConfigRecord | undefined;

    // Migrate stream-level vars by position since datasets differ between input types.
    // Use the new stream as the structural base (preserving data_stream identity) and seed
    // its vars with values from the old stream so user configuration is carried over.
    if (originalInputToMigrate && originalInputToMigrate.streams.length > 0) {
      oldStream = originalInputToMigrate.streams[idx];
      // Capture old input-level vars so that vars which moved from input-level in the
      // old input to stream-level in the new input are also carried over.
      oldInputVars = originalInputToMigrate.vars;
    } else if (newStream.migrate_from) {
      // When streams have migrate_from:
      // each stream with migrate_from is matched positionally to the corresponding old stream in the specified input type.
      const counter = streamMigrateFromCounters[newStream.migrate_from] ?? 0;
      streamMigrateFromCounters[newStream.migrate_from] = counter + 1;
      const oldInputForStream = findInputForMigration(
        allBaseInputs,
        newStream.migrate_from,
        update.policy_template
      );
      oldStream = oldInputForStream?.streams[counter];
      if (oldStream) {
        streamMigrationOccurred = true;
        // Capture the old input so we can preserve its enabled state below.
        if (!oldInputForStreamMigration) {
          oldInputForStreamMigration = oldInputForStream;
        }
      }
      // Capture old input-level vars even when no positional old stream exists.
      oldInputVars = oldInputForStream?.vars;
    }

    if (!oldStream && !oldInputVars) return newStream;

    return migrateStreamVars(newStream as InputsOverride, oldStream, oldInputVars);
  });

  // If stream-level migration succeeded without an input-level migrate_from, carry the
  // old input's enabled state over instead of unconditionally enabling the new input.
  if (streamMigrationOccurred && update.migrate_from === undefined) {
    update.enabled = oldInputForStreamMigration?.enabled ?? update.enabled;
  }
}

export function deepMergeVars(original: any, override: any, keepOriginalValue = false): any {
  if (!override.vars) {
    return original;
  }
  if (!original.vars) {
    original.vars = { ...override.vars };
  }

  const result = { ...original };

  const overrideVars = Array.isArray(override.vars)
    ? override.vars
    : Object.entries(override.vars!).map(([key, rest]) => ({
        name: key,
        ...(rest as any),
      }));

  for (const { name, ...overrideVal } of overrideVars) {
    const originalVar = original.vars[name];

    result.vars[name] = { ...originalVar, ...overrideVal };

    // Persist the original value only when it was explicitly set (not null / undefined).
    // A null original value is treated as "not configured" so the new package default wins.
    if (keepOriginalValue && originalVar?.value != null) {
      result.vars[name].value = originalVar.value;
    }
  }

  return result;
}

export function getUpdatedGlobalVars(packageInfo: PackageInfo, packagePolicy: NewPackagePolicy) {
  if (!packageInfo.vars) {
    return undefined;
  }

  const packageInfoVars = packageInfo.vars.reduce(varsReducer, {});
  const result = deepMergeVars(packagePolicy, { vars: packageInfoVars }, true);
  return removeStaleVars(result, { vars: packageInfoVars }).vars;
}

export interface SupportsVars {
  vars?: PackagePolicyConfigRecord;
}

export function removeStaleVars<T extends SupportsVars>(
  currentWithVars: T,
  expectedVars: SupportsVars
): T {
  if (!currentWithVars.vars) {
    return currentWithVars;
  }

  if (!expectedVars.vars) {
    return {
      ...currentWithVars,
      vars: {},
    };
  }

  const filteredVars = Object.entries(currentWithVars.vars).reduce<PackagePolicyConfigRecord>(
    (acc, [key, val]) => {
      if (key in expectedVars.vars!) {
        acc[key] = val;
      }
      return acc;
    },
    {}
  );

  return {
    ...currentWithVars,
    vars: filteredVars,
  };
}

/**
 * Replaces null/undefined values on bool-typed vars with `false` after migration.
 *
 * Priority (from highest to lowest):
 *  1. Old variable value (carried over by deepMergeVars when non-null)
 *  2. New package default (used by deepMergeVars when old value is null)
 *  3. `false` — guaranteed fallback for bool vars so the compiled agent YAML never
 *     contains an explicit `null` for a boolean field.
 */
export function sanitizeMigratedVars<T extends SupportsVars>(obj: T): T {
  if (!obj.vars) return obj;
  return {
    ...obj,
    vars: Object.fromEntries(
      Object.entries(obj.vars).map(([k, v]) => [
        k,
        v.type === 'bool' && v.value == null ? { ...v, value: false } : v,
      ])
    ),
  };
}
