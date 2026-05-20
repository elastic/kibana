import type { LensPublicStart, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { type Filter, type Query } from '@kbn/es-query';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { LensApi } from '@kbn/lens-plugin/public';
import type { MlApi } from '../../../services/ml_api_service';
import { QuickJobCreatorBase, type CreateState } from '../job_from_dashboard';
export declare class QuickLensJobCreator extends QuickJobCreatorBase {
    private readonly lens;
    constructor(lens: LensPublicStart, dataViews: DataViewsContract, kibanaConfig: IUiSettingsClient, timeFilter: TimefilterContract, share: SharePluginStart, mlApi: MlApi);
    createAndSaveJob(jobId: string, bucketSpan: string, embeddable: LensApi, startJob: boolean, runInRealTime: boolean, layerIndex: number): Promise<CreateState>;
    createAndStashADJob(vis: LensSavedObjectAttributes, startString: string, endString: string, query: Query, filters: Filter[], layerIndex: number | undefined): Promise<void>;
    private createJob;
    private createADJobFromLensSavedObject;
}
