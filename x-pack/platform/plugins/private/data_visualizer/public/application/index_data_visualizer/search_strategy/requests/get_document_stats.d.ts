import type { estypes } from '@elastic/elasticsearch';
import type { ISearchOptions } from '@kbn/search-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DocumentCountStats, OverallStatsSearchStrategyParams } from '../../../../../common/types/field_stats';
export declare const getDocumentCountStats: (search: DataPublicPluginStart["search"], params: OverallStatsSearchStrategyParams, searchOptions: ISearchOptions, browserSessionSeed?: string, probability?: number | null, minimumRandomSamplerDocCount?: number) => Promise<DocumentCountStats>;
export declare const processDocumentCountStats: (body: estypes.SearchResponse | undefined, params: OverallStatsSearchStrategyParams, randomlySampled?: boolean) => Omit<DocumentCountStats, "probability"> | undefined;
