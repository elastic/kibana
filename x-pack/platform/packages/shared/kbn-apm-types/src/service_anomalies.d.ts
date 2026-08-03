import type { AnomalyDetectorType } from './anomaly_detector_type';
import type { Environment } from './environment_rt';
export interface ServiceAnomaliesResponse {
    mlJobIds: string[];
    serviceAnomalies: Array<{
        serviceName: string;
        jobId: string;
        transactionType: string;
        actualValue: number;
        anomalyScore: number;
        detectorType?: AnomalyDetectorType;
        anomalyEnvironment: Environment;
    }>;
}
