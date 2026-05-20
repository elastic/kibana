import type { CaseStatuses } from '../../../common/types/domain';
import type { AlertInfo } from '../../common/types';
interface Alert {
    id: string;
    index: string;
    destination?: {
        ip: string;
    };
    source?: {
        ip: string;
    };
}
export type CasesClientGetAlertsResponse = Alert[];
/**
 * Defines the fields necessary to update an alert's status.
 */
export interface UpdateAlertStatusRequest {
    id: string;
    index: string;
    status: CaseStatuses;
    closingReason?: string;
}
export interface AlertUpdateStatus {
    alerts: UpdateAlertStatusRequest[];
}
export interface AlertGet {
    alertsInfo: AlertInfo[];
}
export interface UpdateAlertCasesRequest {
    alerts: AlertInfo[];
    caseIds: string[];
}
export interface RemoveCaseIdFromAlertsRequest {
    alerts: AlertInfo[];
    caseId: string;
}
export {};
