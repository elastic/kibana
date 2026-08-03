import React from 'react';
import type { CaseStatuses } from '../../../common/types/domain';
interface Props {
    selectedStatus: CaseStatuses;
    onStatusChange: (status: CaseStatuses) => void;
    isLoading: boolean;
    isDisabled: boolean;
}
export declare const StatusSelector: React.FC<Props>;
export {};
