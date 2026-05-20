import type { DataView } from '@kbn/data-views-plugin/public';
import type { Field, Aggregation, SplitField, AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { JobCreator } from './job_creator';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';
export declare class PopulationJobCreator extends JobCreator {
    private _populatonField;
    private _byFields;
    protected _type: JOB_TYPE;
    constructor(mlApi: MlApi, newJobCapsService: NewJobCapsService, indexPattern: DataView, savedSearch: SavedSearch | null, query: object);
    setByField(field: SplitField, index: number): void;
    removeByField(index: number): void;
    getByField(index: number): SplitField;
    setPopulationField(field: SplitField): void;
    removePopulationField(): void;
    get populationField(): SplitField;
    addDetector(agg: Aggregation, field: Field): void;
    editDetector(agg: Aggregation, field: Field, index: number): void;
    private _createDetector;
    removeDetector(index: number): void;
    get aggFieldPairs(): AggFieldPair[];
    cloneFromExistingJob(job: Job, datafeed: Datafeed): void;
}
