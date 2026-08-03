import React from 'react';
import { CaseStatuses } from '../../../common/types/domain';
interface Props {
    currentStatus: CaseStatuses;
    totalAlerts: number;
    syncAlertsEnabled: boolean;
    disabled?: boolean;
    isLoading?: boolean;
    onStatusChanged: (status: CaseStatuses, closeReason?: string) => void;
}
export declare const StatusContextMenu: React.NamedExoticComponent<Props>;
export {};
