import type { FC } from 'react';
import { type CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import { type MlAnomalyDetectionAlertParams } from '@kbn/ml-common-types/alerts';
import { type MlAnomalyAlertTriggerProps } from './ml_anomaly_alert_trigger';
interface ConfigValidatorProps {
    alertInterval: string;
    jobConfigs: CombinedJobWithStats[];
    alertParams: MlAnomalyDetectionAlertParams;
    alertNotifyWhen: MlAnomalyAlertTriggerProps['alertNotifyWhen'];
    maxNumberOfBuckets?: number;
}
/**
 * Validated alert configuration
 */
export declare const ConfigValidator: FC<ConfigValidatorProps>;
export {};
