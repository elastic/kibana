import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { DeleteDataViewApiResponseSchema } from '../types/api_delete_response_schema';
interface DeleteDataViewFnOptions {
    dataViewsService: DataViewsService;
    dataViewName: string;
}
export declare const deleteDataViewFn: ({ dataViewsService, dataViewName, }: DeleteDataViewFnOptions) => Promise<DeleteDataViewApiResponseSchema>;
export {};
