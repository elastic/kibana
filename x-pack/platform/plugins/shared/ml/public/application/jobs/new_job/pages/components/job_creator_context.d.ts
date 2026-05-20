import type { Field, Aggregation } from '@kbn/ml-anomaly-utils';
import type { TimeBuckets } from '@kbn/ml-time-buckets';
import type { JobCreatorType } from '../../common/job_creator';
import type { ChartLoader } from '../../common/chart_loader';
import type { MapLoader } from '../../common/map_loader';
import type { ResultsLoader } from '../../common/results_loader';
import type { JobValidator } from '../../common/job_validator';
import type { ExistingJobsAndGroups } from '../../../../services/job_service';
export interface JobCreatorContextValue {
    jobCreatorUpdated: number;
    jobCreatorUpdate: () => void;
    jobCreator: JobCreatorType;
    chartLoader: ChartLoader;
    mapLoader: MapLoader;
    resultsLoader: ResultsLoader;
    chartInterval: TimeBuckets;
    jobValidator: JobValidator;
    jobValidatorUpdated: number;
    fields: Field[];
    aggs: Aggregation[];
    existingJobsAndGroups: ExistingJobsAndGroups;
}
export declare const JobCreatorContext: import("react").Context<JobCreatorContextValue>;
