import type { estypes } from '@elastic/elasticsearch';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { FilterStats } from '@kbn/ml-common-types/filters';
import type { MlClient } from '../../lib/ml_client';
export interface FormFilter {
    filterId: string;
    description?: string;
    addItems?: string[];
    removeItems?: string[];
}
export interface UpdateFilter {
    description?: string;
    addItems?: string[];
    removeItems?: string[];
}
export interface FilterRequest {
    filter_id: string;
    description?: string;
    add_items?: string[];
    remove_items?: string[];
}
interface FilterUsage {
    jobs: string[];
    detectors: string[];
}
interface FiltersInUse {
    [id: string]: FilterUsage;
}
export declare class FilterManager {
    private _mlClient;
    constructor(_mlClient: MlClient);
    getFilter(filterId: string): Promise<FilterStats>;
    getAllFilters(): Promise<estypes.MlFilter[]>;
    getAllFilterStats(): Promise<FilterStats[]>;
    newFilter(filter: FormFilter): Promise<estypes.MlPutFilterResponse>;
    updateFilter(filterId: string, filter: UpdateFilter): Promise<estypes.MlUpdateFilterResponse>;
    deleteFilter(filterId: string): Promise<estypes.AcknowledgedResponseBase>;
    buildFiltersInUse(jobsList: Job[]): FiltersInUse;
}
export {};
