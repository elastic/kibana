import React from 'react';
import { type IntegrationStatusFilterType } from '../screens/browse_integrations/types';
export interface StatusFilterProps {
    selectedStatuses?: IntegrationStatusFilterType[];
    onChange: (statuses: IntegrationStatusFilterType[]) => void;
    testSubjPrefix?: string;
    popoverId?: string;
}
export declare const StatusFilter: React.FC<StatusFilterProps>;
