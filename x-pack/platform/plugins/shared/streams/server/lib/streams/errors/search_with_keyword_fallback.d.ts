import type { Logger } from '@kbn/core/server';
import { type SearchMode } from '../../../../common/queries';
/**
 * Executes a search using the resolved search mode, falling back to keyword
 * when the mode was auto-resolved (caller omitted `searchMode`) and the first
 * attempt fails. Explicit mode requests propagate errors to the caller.
 */
export declare function searchWithKeywordFallback<T>(logger: Logger, opts: {
    searchMode: SearchMode | undefined;
    label: string;
    streamNames: string[];
}, execute: (mode: SearchMode) => Promise<T>): Promise<T>;
