import type { DataView } from '@kbn/data-views-plugin/public';
import type { Field, Aggregation, SplitField, AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { JobCreator } from './job_creator';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';
export declare class GeoJobCreator extends JobCreator {
    private _geoField;
    private _geoAgg;
    private _splitField;
    protected _type: JOB_TYPE;
    constructor(mlApi: MlApi, newJobCapsService: NewJobCapsService, indexPattern: DataView, savedSearch: SavedSearch | null, query: object);
    setDefaultDetectorProperties(geo: Aggregation | null): void;
    get geoField(): Field | null;
    get geoAgg(): Aggregation | null;
    setGeoField(field: Field | null): void;
    setSplitField(field: SplitField): void;
    removeSplitField(): void;
    get splitField(): SplitField;
    private _createDetector;
    get aggFieldPairs(): AggFieldPair[];
    cloneFromExistingJob(job: Job, datafeed: Datafeed): void;
}
