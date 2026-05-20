import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { MapApi } from '@kbn/maps-plugin/public';
import type { MlApi } from '../../../services/ml_api_service';
import type { CreateState } from '../job_from_dashboard';
import { QuickJobCreatorBase } from '../job_from_dashboard';
export declare class QuickGeoJobCreator extends QuickJobCreatorBase {
    constructor(dataViews: DataViewsContract, kibanaConfig: IUiSettingsClient, timeFilter: TimefilterContract, share: SharePluginStart, mlApi: MlApi);
    createAndSaveGeoJob({ jobId, bucketSpan, embeddable, startJob, runInRealTime, dataViewId, sourceDataView, geoField, splitField, layerLevelQuery, }: {
        jobId: string;
        bucketSpan: string;
        embeddable: MapApi;
        startJob: boolean;
        runInRealTime: boolean;
        dataViewId?: string;
        sourceDataView?: DataView;
        geoField: string;
        splitField: string | null;
        layerLevelQuery: Query | null;
    }): Promise<CreateState>;
    createAndStashGeoJob(dataViewId: string, startString: string, endString: string, query: Query, filters: Filter[], embeddableQuery: Query, embeddableFilters: Filter[], geoField: string, splitField?: string | null, layerLevelQuery?: Query): Promise<void>;
    private createGeoJob;
    private createGeoJobFromMapEmbeddable;
}
