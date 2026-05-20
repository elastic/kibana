import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ISearchGeneric } from '@kbn/search-types';
import { type DataView } from '@kbn/data-views-plugin/common';
export interface LogCategoryDetailsParams {
    additionalFilters: QueryDslQueryContainer[];
    endTimestamp: string;
    index: string;
    messageField: string;
    startTimestamp: string;
    timeField: string;
    dataView: DataView;
}
export interface CategoryDetailsServiceDependencies {
    search: ISearchGeneric;
}
