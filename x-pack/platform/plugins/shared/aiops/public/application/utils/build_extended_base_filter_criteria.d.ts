import type { estypes } from '@elastic/elasticsearch';
import type { Query } from '@kbn/es-query';
import { type SignificantItem } from '@kbn/ml-agg-utils';
import type { GroupTableItem } from '@kbn/aiops-log-rate-analysis/state';
export declare function buildExtendedBaseFilterCriteria(timeFieldName?: string, earliestMs?: number, latestMs?: number, query?: Query['query'], selectedSignificantItem?: SignificantItem, includeSelectedSignificantItem?: boolean, selectedGroup?: GroupTableItem | null): estypes.QueryDslQueryContainer[];
