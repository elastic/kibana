import type { estypes } from '@elastic/elasticsearch';
import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { UseDataGridReturnType } from '@kbn/ml-data-grid';
import type { MlApi } from '../../services/ml_api_service';
export declare const getIndexData: (mlApi: MlApi, jobConfig: DataFrameAnalyticsConfig | undefined, dataGrid: UseDataGridReturnType, searchQuery: estypes.QueryDslQueryContainer, options: {
    didCancel: boolean;
}) => Promise<void>;
