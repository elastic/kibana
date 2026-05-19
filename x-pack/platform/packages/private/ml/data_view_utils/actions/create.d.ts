import type { DataViewsService, RuntimeField } from '@kbn/data-views-plugin/common';
import type { CreateDataViewApiResponseSchema } from '../types/api_create_response_schema';
interface CreateDataViewFnOptions {
    dataViewsService: DataViewsService;
    dataViewName: string;
    runtimeMappings: Record<string, RuntimeField>;
    timeFieldName?: string;
    errorFallbackId: string;
}
export declare const createDataViewFn: ({ dataViewsService, dataViewName, runtimeMappings, timeFieldName, errorFallbackId, }: CreateDataViewFnOptions) => Promise<CreateDataViewApiResponseSchema>;
export {};
