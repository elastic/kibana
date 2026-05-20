import type { estypes } from '@elastic/elasticsearch';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Field, Aggregation, SplitField } from '@kbn/ml-anomaly-utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job, CustomRule } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import { JobCreator } from './job_creator';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
export interface RichDetector {
    agg: Aggregation | null;
    field: SplitField;
    byField: SplitField;
    overField: SplitField;
    partitionField: SplitField;
    excludeFrequent: estypes.MlExcludeFrequent | null;
    description: string | null;
    customRules: CustomRule[] | null;
    useNull: boolean | null;
}
export declare class AdvancedJobCreator extends JobCreator {
    protected _type: JOB_TYPE;
    private _richDetectors;
    private _queryString;
    constructor(mlApi: MlApi, newJobCapsService: NewJobCapsService, indexPattern: DataView, savedSearch: SavedSearch | null, query: object);
    addDetector(agg: Aggregation, field: Field, byField: SplitField, overField: SplitField, partitionField: SplitField, excludeFrequent: estypes.MlExcludeFrequent | null, description: string | null, useNull: boolean | null): void;
    editDetector(agg: Aggregation, field: Field, byField: SplitField, overField: SplitField, partitionField: SplitField, excludeFrequent: estypes.MlExcludeFrequent | null, description: string | null, index: number, useNull: boolean | null): void;
    private _createDetector;
    removeDetector(index: number): void;
    get richDetectors(): RichDetector[];
    get queryString(): string;
    set queryString(qs: string);
    get isValidQueryString(): boolean;
    cloneFromExistingJob(job: Job, datafeed: Datafeed): void;
}
