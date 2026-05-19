/** Artifact type identifier for runbooks */
export declare const RUNBOOK_ARTIFACT_TYPE = "runbook";
/** Default maximum character length for artifact values (applies when no type-specific override exists) */
export declare const DEFAULT_ARTIFACT_VALUE_LIMIT = 1024;
/**
 * Type-specific artifact value length limits.
 *
 * To raise or add a limit for a new artifact type, add an entry here.
 * The framework schema resolves: `ARTIFACT_VALUE_LIMITS[type] ?? DEFAULT_ARTIFACT_VALUE_LIMIT`.
 * No framework code changes are needed — only this map.
 */
export declare const ARTIFACT_VALUE_LIMITS: Readonly<Record<string, number>>;
/** The highest value in ARTIFACT_VALUE_LIMITS (used as the Zod base .max()) */
export declare const MAX_ARTIFACT_VALUE_LIMIT: number;
