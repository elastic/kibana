import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { MlApi } from '../../services/ml_api_service';
import type { FormMessage } from '../../data_frame_analytics/pages/analytics_management/hooks/use_create_analytics_form/state';
interface CreateKibanaDataViewResponse {
    success: boolean;
    error?: string;
    message: string;
    dataViewId?: string;
}
export declare function checkIndexExists(destIndex: string, mlApi: MlApi): Promise<{
    resp: Record<string, {
        exists: boolean;
    }> | undefined;
    errorMessage: string | undefined;
}>;
export declare function retryIndexExistsCheck(destIndex: string, ml: MlApi): Promise<{
    success: boolean;
    indexExists: boolean;
    errorMessage?: string;
}>;
export declare const createKibanaDataView: (destinationIndex: string, dataViewsService: DataViewsContract, ml: MlApi, timeFieldName?: string, callback?: (response: FormMessage) => void) => Promise<CreateKibanaDataViewResponse>;
export {};
