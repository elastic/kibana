import type { DataView } from '@kbn/data-views-plugin/public';
import { type Aggregation, type AggFieldPair, type Field } from '@kbn/ml-anomaly-utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job, BucketSpan } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import { JobCreator } from './job_creator';
import type { JOB_TYPE } from '../../../../../../common/constants/new_job';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
export declare class SingleMetricJobCreator extends JobCreator {
    protected _type: JOB_TYPE;
    constructor(mlApi: MlApi, newJobCapsService: NewJobCapsService, indexPattern: DataView, savedSearch: SavedSearch | null, query: object);
    setDetector(agg: Aggregation, field: Field): void;
    set bucketSpan(bucketSpan: BucketSpan);
    get bucketSpan(): BucketSpan;
    private _createDatafeedAggregations;
    get aggFieldPair(): AggFieldPair | null;
    cloneFromExistingJob(job: Job, datafeed: Datafeed): void;
}
