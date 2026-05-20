import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { IndicesOptions } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { MlApi } from '../../../../services/ml_api_service';
interface CategoryResults {
    success: boolean;
    results: string[];
}
export declare function getCategoryFields(mlApi: MlApi, indexPatternName: string, fieldName: string, size: number, query: any, runtimeMappings?: RuntimeMappings, indicesOptions?: IndicesOptions): Promise<CategoryResults>;
export {};
