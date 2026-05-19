import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DataPublicPluginStart, FilterManager } from '@kbn/data-plugin/public';
import type { ExecutionContextSearch, ProjectRouting } from '@kbn/es-query';
import { type AggregateQuery, type Filter, type Query, type TimeRange } from '@kbn/es-query';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { LensRuntimeState } from '@kbn/lens-common';
export interface MergedSearchContext {
    now: number;
    timeRange: TimeRange | undefined;
    query: Array<Query | AggregateQuery>;
    filters: Filter[];
    disableWarningToasts: boolean;
    esqlVariables?: ESQLControlVariable[];
    projectRouting?: ProjectRouting;
}
export declare function getMergedSearchContext({ attributes }: LensRuntimeState, { filters, query, timeRange, esqlVariables, projectRouting, }: {
    filters?: Filter[];
    query?: Query | AggregateQuery;
    timeRange?: TimeRange;
    esqlVariables?: ESQLControlVariable[];
    projectRouting?: ProjectRouting;
}, customTimeRange$: PublishingSubject<TimeRange | undefined>, parentApi: unknown, { data, injectFilterReferences, }: {
    data: DataPublicPluginStart;
    injectFilterReferences: FilterManager['inject'];
}): MergedSearchContext;
export declare function getExecutionSearchContext(searchContext: MergedSearchContext): ExecutionContextSearch;
