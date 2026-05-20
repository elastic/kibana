import type { FC } from 'react';
import type { MlAnomalyDetectionAlertParams } from '@kbn/ml-common-types/alerts';
import type { AlertingApiService } from '../../application/services/ml_api_service/alerting';
export interface PreviewAlertConditionProps {
    alertingApiService: AlertingApiService;
    alertParams: MlAnomalyDetectionAlertParams;
}
export declare const PreviewAlertCondition: FC<PreviewAlertConditionProps>;
