import type { DataViewsService } from '@kbn/data-views-plugin/common';
export declare class DataViewHandler {
    private dataViewService;
    constructor(dataViewService: DataViewsService);
    getDataViewId(indexName: string): Promise<string | undefined>;
    deleteDataViewById(dataViewId: string): Promise<void>;
}
