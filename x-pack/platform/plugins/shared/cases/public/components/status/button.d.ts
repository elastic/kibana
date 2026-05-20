import React from 'react';
import { CaseStatuses } from '../../../common/types/domain';
interface Props {
    status: CaseStatuses;
    totalAlerts: number;
    syncAlertsEnabled: boolean;
    isLoading: boolean;
    onStatusChanged: (status: CaseStatuses, closeReason?: string) => void;
}
export declare const StatusActionButton: React.NamedExoticComponent<Props>;
export {};
