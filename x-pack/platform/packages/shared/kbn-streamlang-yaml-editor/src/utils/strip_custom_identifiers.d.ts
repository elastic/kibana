import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
/**
 * Recursively removes customIdentifier from all steps in the DSL.
 * This is used to clean the DSL before displaying it to users, as customIdentifiers
 * are internal implementation details used for tracking and should not be visible.
 */
export declare function stripCustomIdentifiers(dsl: StreamlangDSL): StreamlangDSL;
