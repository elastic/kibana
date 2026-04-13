import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
/**
 * Recursively collects all descendant step IDs
 * for a given parent step ID.
 */
export declare function collectDescendantStepIds(steps: StreamlangStepWithUIAttributes[], parentId: string): Set<string>;
