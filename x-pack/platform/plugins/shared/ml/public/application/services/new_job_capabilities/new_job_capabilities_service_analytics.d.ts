import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Field, NewJobCapsResponse } from '@kbn/ml-anomaly-utils';
import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import { NewJobCapabilitiesServiceBase } from './new_job_capabilities';
import type { MlApi } from '../ml_api_service';
export declare function removeNestedFieldChildren(resp: NewJobCapsResponse, indexPatternTitle: string): Field[];
export declare class NewJobCapsServiceAnalytics extends NewJobCapabilitiesServiceBase {
    private _mlApiService;
    constructor(mlApiService: MlApi);
    initializeFromDataVIew(dataView: DataView): Promise<void>;
    isKeywordAndTextType(fieldName: string): boolean;
    getDefaultFields(jobConfig: DataFrameAnalyticsConfig, needsDestIndexFields: boolean): {
        selectedFields: Field[];
        docFields: Field[];
        depVarType?: ES_FIELD_TYPES;
    };
}
export declare const mlJobCapsServiceAnalyticsFactory: (mlApi: MlApi) => NewJobCapsServiceAnalytics;
export declare const useNewJobCapsServiceAnalytics: () => NewJobCapsServiceAnalytics;
