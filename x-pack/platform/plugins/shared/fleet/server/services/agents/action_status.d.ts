import type { ElasticsearchClient } from '@kbn/core/server';
import type { FleetServerAgentAction, ActionStatus, ActionStatusOptions } from '../../types';
/**
 * Return current bulk actions.
 * These are a combination of agent actions and agent policy change actions, sorted by timestamp.
 * With page=i and perPage=N, this works by:
 * 1. fetching (i+1)*N agent actions
 * 2. fetching (i+1)*N agent policy actions
 * 3. concatenating and sorting those
 * 4. returning the [i*N : (i+1)*N[ slice of the array
 */
export declare function getActionStatuses(esClient: ElasticsearchClient, options: ActionStatusOptions, namespace?: string): Promise<ActionStatus[]>;
export declare function getPage(options: ActionStatusOptions): number;
export declare function getPerPage(options: ActionStatusOptions): number;
export declare function getCancelledActions(esClient: ElasticsearchClient): Promise<Array<{
    actionId: string;
    timestamp?: string;
}>>;
export declare const hasRolloutPeriodPassed: (source: FleetServerAgentAction) => boolean;
