import type { FC } from 'react';
import type { TimeBuckets } from '@kbn/ml-time-buckets';
import { WIZARD_STEPS } from '../components/step_types';
import type { ExistingJobsAndGroups } from '../../../../services/job_service';
import type { JobCreatorType } from '../../common/job_creator';
import type { ChartLoader } from '../../common/chart_loader';
import type { MapLoader } from '../../common/map_loader';
import type { ResultsLoader } from '../../common/results_loader';
import type { JobValidator } from '../../common/job_validator';
interface Props {
    jobCreator: JobCreatorType;
    chartLoader: ChartLoader;
    mapLoader: MapLoader;
    resultsLoader: ResultsLoader;
    chartInterval: TimeBuckets;
    jobValidator: JobValidator;
    existingJobsAndGroups: ExistingJobsAndGroups;
    firstWizardStep: WIZARD_STEPS;
}
export declare const Wizard: FC<Props>;
export {};
