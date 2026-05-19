import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { type GroupActionRow } from '../queries/group_actions_query';
export interface FetchGroupActionsOptions {
    groupHashes: string[];
    abortSignal?: AbortSignal;
    expressions: ExpressionsStart;
}
/**
 * Executes an ES|QL query to fetch deactivate/snooze/tag actions for the given group hashes.
 */
export declare const fetchGroupActions: ({ groupHashes, abortSignal, expressions, }: FetchGroupActionsOptions) => Promise<GroupActionRow[]>;
