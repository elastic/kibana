import type { IScopedClusterClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { type NewJobCaps } from '@kbn/ml-anomaly-utils';
export declare function fieldServiceProvider(indexPattern: string, isRollup: boolean, client: IScopedClusterClient, dataViewsService: DataViewsService): FieldsService;
declare class FieldsService {
    private _indexPattern;
    private _isRollup;
    private _mlClusterClient;
    private _dataViewsService;
    constructor(indexPattern: string, isRollup: boolean, client: IScopedClusterClient, dataViewsService: DataViewsService);
    private loadFieldCaps;
    private createFields;
    private isCounterField;
    private isFieldAggregatable;
    getData(includeNested?: boolean): Promise<NewJobCaps>;
}
export {};
