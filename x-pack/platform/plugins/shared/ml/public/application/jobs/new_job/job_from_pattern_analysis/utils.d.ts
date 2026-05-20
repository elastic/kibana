import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { CategorizationType } from './quick_create_job';
export declare function redirectToADJobWizards(categorizationType: CategorizationType, dataView: DataView, field: DataViewField, partitionField: DataViewField | null, stopOnWarn: boolean, query: QueryDslQueryContainer, timeRange: TimeRange, share: SharePluginStart): Promise<void>;
