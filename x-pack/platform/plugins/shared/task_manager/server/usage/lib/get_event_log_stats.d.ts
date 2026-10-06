import type { ElasticsearchClient } from '@kbn/core/server';
import type { EventLogStatsResults } from './types';
export declare const nanosToMillis: (nanos?: number | null) => number | null;
/**
 * Aggregates cluster-wide task execution volume and schedule delay from the event log.
 *
 * `task-run-start` is used rather than `task-run` because it is emitted once per execution even
 * when the task never completes (crash, cancellation), which makes it the truer measure of how
 * many task runs were actually started.
 */
export declare function getEventLogStats(esClient: ElasticsearchClient, signal: AbortSignal): Promise<EventLogStatsResults>;
