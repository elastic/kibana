import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ISearchGeneric } from '@kbn/search-types';
export interface CategorizeLogsServiceDependencies {
    search: ISearchGeneric;
}
export interface LogCategorizationParams {
    documentFilters: QueryDslQueryContainer[];
    endTimestamp: string;
    index: string;
    messageField: string;
    startTimestamp: string;
    timeField: string;
}
