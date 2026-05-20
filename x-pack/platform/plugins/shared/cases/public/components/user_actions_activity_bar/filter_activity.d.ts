import React from 'react';
import type { CaseUserActionsStats } from '../../containers/types';
import type { UserActivityFilter } from './types';
interface FilterActivityProps {
    isLoading?: boolean;
    type: UserActivityFilter;
    userActionsStats?: CaseUserActionsStats;
    onFilterChange: (type: UserActivityFilter) => void;
}
export declare const FilterActivity: React.NamedExoticComponent<FilterActivityProps>;
export {};
