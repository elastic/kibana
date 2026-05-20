import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type CreateState, QuickJobCreatorBase } from '../job_from_dashboard/quick_create_job_base';
import type { MlApi } from '../../../services/ml_api_service';
export declare const CATEGORIZATION_TYPE: {
    readonly COUNT: ML_JOB_AGGREGATION.COUNT;
    readonly HIGH_COUNT: ML_JOB_AGGREGATION.HIGH_COUNT;
    readonly RARE: ML_JOB_AGGREGATION.RARE;
};
export type CategorizationType = (typeof CATEGORIZATION_TYPE)[keyof typeof CATEGORIZATION_TYPE];
export declare class QuickCategorizationJobCreator extends QuickJobCreatorBase {
    private data;
    constructor(dataViews: DataViewsContract, kibanaConfig: IUiSettingsClient, timeFilter: TimefilterContract, share: SharePluginStart, data: DataPublicPluginStart, mlApi: MlApi);
    createAndSaveJob(categorizationType: CategorizationType, jobId: string, bucketSpan: string, dataView: DataView, field: DataViewField, partitionField: DataViewField | null, stopOnWarn: boolean, query: QueryDslQueryContainer, timeRange: TimeRange, startJob: boolean, runInRealTime: boolean): Promise<CreateState>;
    createAndStashADJob(categorizationType: CategorizationType, dataViewId: string, fieldName: string, partitionFieldName: string | null, stopOnWarn: boolean, startString: string, endString: string, query: QueryDslQueryContainer): Promise<void>;
    private createJob;
}
