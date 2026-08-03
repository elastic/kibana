import type { AnomalyDetectorType } from './anomaly_detector_type';
import type { Environment } from './environment_rt';
export interface ServiceAnomalyStats {
    transactionType?: string;
    anomalyScore?: number;
    actualValue?: number;
    jobId?: string;
    detectorType?: AnomalyDetectorType;
    anomalyEnvironment?: Environment;
}
