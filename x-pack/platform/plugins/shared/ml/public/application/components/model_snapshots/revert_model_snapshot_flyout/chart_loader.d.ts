import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { MlResultsService } from '../../../services/results_service';
import type { Anomaly } from '../../../jobs/new_job/common/results_loader/results_loader';
import type { LineChartPoint } from '../../../jobs/new_job/common/chart_loader/chart_loader';
export declare function chartLoaderProvider(mlResultsService: MlResultsService): {
    loadEventRateForJob: (job: CombinedJobWithStats, bucketSpanMs: number, bars: number) => Promise<LineChartPoint[]>;
    loadAnomalyDataForJob: (job: CombinedJobWithStats, bucketSpanMs: number, bars: number) => Promise<Record<number, Anomaly[]>>;
};
