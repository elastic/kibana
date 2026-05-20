import { type IFieldFormat } from '@kbn/field-formats-plugin/common';
import { type MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import type { AlertExecutionResult, PreviewResponse } from '@kbn/ml-common-types/alerts';
import type { FieldFormatsRegistryProvider } from '@kbn/ml-common-types/kibana';
import type { MlClient } from '../ml_client';
import type { MlAnomalyDetectionAlertParams, MlAnomalyDetectionAlertPreviewRequest } from '../../routes/schemas/alerting_schema';
import type { AnomalyDetectionAlertContext, AnomalyDetectionAlertPayload } from './register_anomaly_detection_alert_type';
import type { DatafeedsService } from '../../models/job_service/datafeeds';
import type { GetDataViewsService } from '../data_views_utils';
/**
 * TODO Replace with URL generator when https://github.com/elastic/kibana/issues/59453 is resolved
 */
export declare function buildExplorerUrl(jobIds: string[], timeRange: {
    from: string;
    to: string;
    mode?: string;
}, type: MlAnomalyResultType, spaceId: string, r?: AlertExecutionResult): string;
export interface AnomalyDetectionAlertFieldFormatters {
    numberFormatter: IFieldFormat['convert'];
    dateFormatter?: IFieldFormat;
    fieldFormatters: Record<string, IFieldFormat['convert']>;
}
export interface AnomalyDetectionRuleState {
    contextFieldFormatters?: AnomalyDetectionAlertFieldFormatters;
}
/**
 * Alerting related server-side methods
 * @param mlClient
 * @param datafeedsService
 */
export declare function alertingServiceProvider(mlClient: MlClient, datafeedsService: DatafeedsService, getFieldsFormatRegistry: FieldFormatsRegistryProvider, getDataViewsService: GetDataViewsService): {
    /**
     * Return the result of an alert condition execution.
     *
     * @param params - Alert params
     * @param spaceId
     */
    execute: (params: MlAnomalyDetectionAlertParams, spaceId: string, state?: AnomalyDetectionRuleState) => Promise<{
        payload: AnomalyDetectionAlertPayload;
        context: AnomalyDetectionAlertContext;
        name: string;
        isHealthy: boolean;
        stateUpdate: AnomalyDetectionRuleState;
    } | undefined>;
    /**
     * Checks how often the alert condition will fire an alert instance
     * based on the provided relative time window.
     *
     * @param previewParams
     */
    preview: ({ alertParams, timeRange, sampleSize, }: MlAnomalyDetectionAlertPreviewRequest) => Promise<PreviewResponse>;
};
export type MlAlertingService = ReturnType<typeof alertingServiceProvider>;
