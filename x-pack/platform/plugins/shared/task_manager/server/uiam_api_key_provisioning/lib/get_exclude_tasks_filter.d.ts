import type { ISavedObjectsRepository } from '@kbn/core/server';
/**
 * Returns task `entityId`s that already have a final UIAM provisioning status
 * (completed, skipped, or failed with a permanent UIAM conversion error code,
 * see {@link PERMANENT_UIAM_CONVERSION_ERROR_CODES}) so the provisioning fetch
 * can exclude them.
 *
 * Mirrors {@link getExcludeRulesFilter} in
 * `x-pack/.../alerting/server/provisioning/lib/get_exclude_rules_filter.ts`.
 */
export declare const getExcludeTasksFilter: (savedObjectsClient: ISavedObjectsRepository) => Promise<string[]>;
