import type { QueryEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import type { Gap } from '../gap';
/**
 * Transforms event log results into Gap objects
 * Filters out invalid gaps/gaps intervals
 */
export declare const transformToGap: (events: Pick<QueryEventsBySavedObjectResult, "data">) => Gap[];
