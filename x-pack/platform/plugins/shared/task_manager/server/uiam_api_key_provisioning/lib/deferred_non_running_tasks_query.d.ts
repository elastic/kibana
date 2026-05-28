import type { estypes } from '@elastic/elasticsearch';
/**
 * Tasks eligible for UIAM API key background conversion:
 * - Not in `running` status, and
 * - Either `runAt` is after `UIAM_PROVISIONING_FETCH_RUN_AT_GT` (Elasticsearch `now+30s`, so an
 *   enabled task will not be claimed for execution imminently), or the task is **disabled** (Task
 *   Manager does not claim disabled tasks, so there is no race with execution regardless of
 *   `runAt`).
 *
 * Optional `excludeTaskEntityIdsWithFinalStatus`: Kibana task document `_id` values are `task:<id>`.
 * Excluding by `ids` prevents re-fetching tasks that already have a SKIPPED or COMPLETED
 * UIAM provisioning status document (see `getExcludeTasksFilter`).
 */
export declare const buildUiamProvisioningFetchQuery: (options?: {
    excludeTaskEntityIdsWithFinalStatus?: string[];
}) => estypes.QueryDslQueryContainer;
