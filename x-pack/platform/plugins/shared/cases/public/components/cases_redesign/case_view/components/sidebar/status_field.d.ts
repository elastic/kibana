import React from 'react';
import type { CaseStatuses } from '../../../../../../common/types/domain';
interface Props {
    selectedStatus: CaseStatuses;
    onStatusChange: (status: CaseStatuses) => void;
    isLoading: boolean;
    isDisabled: boolean;
}
export declare const StatusField: React.FC<Props>;
export {};
