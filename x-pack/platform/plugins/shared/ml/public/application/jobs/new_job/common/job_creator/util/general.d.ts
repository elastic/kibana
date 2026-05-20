import { type Field, type AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlLocatorParams } from '../../../../../../locator';
import type { NewJobCapsService } from '../../../../../services/new_job_capabilities/new_job_capabilities_service';
import type { JobCreatorType } from '..';
export declare function getRichDetectors(newJobCapsService: NewJobCapsService, job: Job, datafeed: Datafeed, additionalFields: Field[], advanced?: boolean): {
    agg: import("@kbn/ml-anomaly-utils").Aggregation | null;
    field: Field | null;
    byField: Field | null;
    overField: Field | null;
    partitionField: Field | null;
    excludeFrequent: import("@elastic/elasticsearch/lib/api/types").MlExcludeFrequent | null;
    description: string | null;
    useNull: boolean | null;
}[];
export declare function createFieldOptions(fields: Field[], additionalFields: Field[]): {
    label: string;
    field: Field;
}[];
export declare function createMlcategoryFieldOption(categorizationFieldName: string | null): {
    label: string;
}[];
export declare function createDocCountFieldOption(usingAggregations: boolean): {
    label: string;
}[];
export declare function isSparseDataJob(job: Job, datafeed: Datafeed): boolean;
export type NavigateToMlManagementLink = (_page: string, pageState?: MlLocatorParams['pageState']) => Promise<void>;
export declare function convertToMultiMetricJob(jobCreator: JobCreatorType, navigateToPath: NavigateToMlManagementLink): void;
export declare function convertToAdvancedJob(jobCreator: JobCreatorType, navigateToPath: NavigateToMlManagementLink): void;
export declare function resetAdvancedJob(jobCreator: JobCreatorType, navigateToPath: NavigateToMlManagementLink): void;
export declare function resetJob(jobCreator: JobCreatorType, navigateToPath: NavigateToMlManagementLink): void;
export declare function advancedStartDatafeed(jobCreator: JobCreatorType | null, navigateToPath: NavigateToMlManagementLink): void;
export declare function aggFieldPairsCanBeCharted(afs: AggFieldPair[]): boolean;
export declare function getJobCreatorTitle(jobCreator: JobCreatorType): string;
export declare function collectAggs(o: any, aggFields: Field[]): void;
export declare function cloneDatafeed(datafeed: Datafeed): import("@elastic/elasticsearch/lib/api/types").MlDatafeed;
