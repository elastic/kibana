import type { NewPackagePolicyInput, PackagePolicyConfigRecord, NewPackagePolicyInputStream, PackageInfo, InputsOverride, RegistryVarsEntry, RegistryStreamWithDataStream } from '../../common/types';
import type { NewPackagePolicy } from '../types';
/**
 * Finds an input in `inputs` matching `type`, preferring a match on `policyTemplate`. Falls back
 * to an entry with no `policy_template` set to handle older stored policies where that field was
 * not reliably populated. Returns undefined when no match is found.
 */
export declare function findInputForMigration(inputs: NewPackagePolicyInput[], idOrType: string, policyTemplate: string | undefined): NewPackagePolicyInput | undefined;
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
export declare function applyInputLevelMigration(update: InputsOverride, allBaseInputs: NewPackagePolicyInput[], inputs: NewPackagePolicyInput[], varDefs?: RegistryVarsEntry[]): NewPackagePolicyInput | undefined;
/**
 * Builds a rename map `{ newVarName: oldVarName }` from `RegistryVarsEntry` definitions that
 * declare `migrate_from.name` (or the legacy string shorthand). Used by `migrateStreamVars` to
 * alias old var values under new names before the name-based `deepMergeVars` lookup runs.
 */
export declare function buildVarRenameMap(varDefs: RegistryVarsEntry[]): Record<string, string>;
/**
 * Merges vars from an old stream (and optionally its parent input's vars) into a new stream,
 * preserving the old stream's `enabled` state.
 *
 * Old input-level vars and old stream-level vars are combined before merging so that vars which
 * moved from input-level in the old input to stream-level in the new input are also carried over.
 * Stream-level vars take priority over input-level vars on collision.
 * `removeStaleVars` then discards any key not defined in the new stream schema.
 *
 * When `varDefs` is provided, vars that declare `migrate_from` on the new stream definition are
 * aliased in `combinedOldVars` under the new name before the name-based merge runs, so renamed
 * vars carry over their old values correctly.
 *
 * `oldStream` may be `undefined` when only input-level vars are available (e.g. the new input
 * has more streams than the old one). In that case `enabled` is left at the new stream's default.
 */
export declare function migrateStreamVars(newStream: InputsOverride, oldStream: NewPackagePolicyInputStream | undefined, oldInputVars: PackagePolicyConfigRecord | undefined, varDefs?: RegistryVarsEntry[]): NewPackagePolicyInputStream;
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
export declare function applyStreamLevelMigration(update: InputsOverride, originalInputToMigrate: NewPackagePolicyInput | undefined, allBaseInputs: NewPackagePolicyInput[], registryStreams?: RegistryStreamWithDataStream[]): void;
/**
 * Carries var values across scopes (input ↔ stream) for same-input-type upgrades when the new
 * schema declares `migrate_from.scope`. Seeds the value into `originalInput` in place so the
 * subsequent `deepMergeVars` + `removeStaleVars` cycle propagates and cleans up automatically.
 *
 * Cross-input-type migrations are handled by `applyInputLevelMigration` / `applyStreamLevelMigration`.
 *
 * - `scope: 'stream'` on an input var: pulls from the matching old stream. `migrate_from.stream`
 *   picks the dataset (bare name or fully-qualified); omit only when the input has exactly one stream.
 * - `scope: 'input'` on a stream var: pulls from old input-level vars.
 * - `migrate_from.name`: look up the old value under that key instead of the var's current name.
 * - No-ops when the destination already has a value, or the source var/stream is missing.
 */
export declare function applyVarScopeMigration(originalInput: NewPackagePolicyInput, registryInputVarDefs: RegistryVarsEntry[] | undefined, registryStreams: RegistryStreamWithDataStream[] | undefined): void;
export declare function deepMergeVars(original: any, override: any, keepOriginalValue?: boolean): any;
export declare function getUpdatedGlobalVars(packageInfo: PackageInfo, packagePolicy: NewPackagePolicy): any;
export interface SupportsVars {
    vars?: PackagePolicyConfigRecord;
}
export declare function removeStaleVars<T extends SupportsVars>(currentWithVars: T, expectedVars: SupportsVars): T;
/**
 * Replaces null/undefined values on bool-typed vars with `false` after migration.
 *
 * Priority (from highest to lowest):
 *  1. Old variable value (carried over by deepMergeVars when non-null)
 *  2. New package default (used by deepMergeVars when old value is null)
 *  3. `false` — guaranteed fallback for bool vars so the compiled agent YAML never
 *     contains an explicit `null` for a boolean field.
 */
export declare function sanitizeMigratedVars<T extends SupportsVars>(obj: T): T;
