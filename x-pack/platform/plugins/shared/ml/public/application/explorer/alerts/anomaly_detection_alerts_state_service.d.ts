import { type Observable, Subscription } from 'rxjs';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { RuleRegistrySearchRequest } from '@kbn/rule-registry-plugin/common';
import { ALERT_DURATION, ALERT_END, ALERT_RULE_NAME, ALERT_START, ALERT_STATUS } from '@kbn/rule-data-utils';
import { ALERT_ANOMALY_DETECTION_JOB_ID, ALERT_ANOMALY_SCORE, ALERT_ANOMALY_TIMESTAMP } from '../../../../common/constants/alerts';
import { StateService } from '../../services/state_service';
import type { AnomalyTimelineStateService } from '../anomaly_timeline_state_service';
export interface AnomalyDetectionAlert {
    id: string;
    [ALERT_ANOMALY_SCORE]: number;
    [ALERT_ANOMALY_DETECTION_JOB_ID]: string;
    [ALERT_ANOMALY_TIMESTAMP]: number;
    [ALERT_START]: number;
    [ALERT_END]: number | undefined;
    [ALERT_RULE_NAME]: string;
    [ALERT_STATUS]: string;
    [ALERT_DURATION]: number;
    color: string;
}
export type AlertsQuery = Exclude<RuleRegistrySearchRequest['query'], undefined>;
export declare class AnomalyDetectionAlertsStateService extends StateService {
    private readonly _anomalyTimelineStateServices;
    private readonly data;
    private readonly timefilter;
    /**
     * Subject that holds the anomaly detection alerts from the alert-as-data index.
     * @internal
     */
    private readonly _aadAlerts$;
    private readonly _isLoading$;
    constructor(_anomalyTimelineStateServices: AnomalyTimelineStateService, data: DataPublicPluginStart, timefilter: TimefilterContract);
    /**
     * Count the number of alerts by status.
     * @param alerts
     */
    countAlertsByStatus(alerts: AnomalyDetectionAlert[]): Record<string, number>;
    readonly anomalyDetectionAlerts$: Observable<AnomalyDetectionAlert[]>;
    /**
     * Query for fetching alerts data based on the job selection and time range.
     */
    readonly alertsQuery$: Observable<AlertsQuery>;
    readonly isLoading$: Observable<boolean>;
    /**
     * Observable for the alerts within the swim lane selection.
     */
    readonly selectedAlerts$: Observable<AnomalyDetectionAlert[] | null>;
    readonly countByStatus$: Observable<Record<string, number>>;
    protected _initSubscriptions(): Subscription;
}
