import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { MlApi } from '../../services/ml_api_service';
export interface FieldTypes {
    [key: string]: ES_FIELD_TYPES;
}
export declare const getIndexFields: (mlApi: MlApi, jobConfig: DataFrameAnalyticsConfig | undefined, needsDestIndexFields: boolean) => {
    defaultSelectedFields: string[];
    fieldTypes: FieldTypes;
    tableFields: string[];
};
