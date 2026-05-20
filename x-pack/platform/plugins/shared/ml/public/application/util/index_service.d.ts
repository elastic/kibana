import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
export declare function indexServiceFactory(dataViewsService: DataViewsContract): {
    getDataViewIdFromName: (name: string, job?: Job) => Promise<string | null>;
    getDataViewById: (id: string) => Promise<DataView>;
    loadDataViewListItems: () => Promise<import("@kbn/data-views-plugin/public").DataViewListItem[]>;
};
export type MlIndexUtils = ReturnType<typeof indexServiceFactory>;
export declare const useMlIndexUtils: () => {
    getDataViewIdFromName: (name: string, job?: Job) => Promise<string | null>;
    getDataViewById: (id: string) => Promise<DataView>;
    loadDataViewListItems: () => Promise<import("@kbn/data-views-plugin/public").DataViewListItem[]>;
};
