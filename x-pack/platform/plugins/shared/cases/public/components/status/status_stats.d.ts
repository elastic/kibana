import React from 'react';
import type { CaseStatuses } from '../../../common/types/domain';
export interface Props {
    caseCount: number | null;
    caseStatus: CaseStatuses;
    isLoading: boolean;
    dataTestSubj?: string;
}
export declare const StatusStats: React.NamedExoticComponent<Props>;
