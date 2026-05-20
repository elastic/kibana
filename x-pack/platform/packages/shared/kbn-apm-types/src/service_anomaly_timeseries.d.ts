import type { Coordinate } from './coordinate';
import type { AnomalyDetectorType } from './anomaly_detector_type';
export interface ServiceAnomalyTimeseries {
    jobId: string;
    type: AnomalyDetectorType;
    environment: string;
    serviceName: string;
    version: number;
    transactionType: string;
    anomalies: Array<Coordinate & {
        actual: number | null;
    }>;
    bounds: Array<{
        x: number;
        y0: number | null;
        y1: number | null;
    }>;
}
