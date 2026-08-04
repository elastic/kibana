import React from 'react';
import type { CaseUserActionsStats } from '../../../../../containers/types';
import type { UserActivityFilter } from '../../../../user_actions_activity_bar/types';
interface TypeFilterProps {
    isLoading?: boolean;
    type: UserActivityFilter;
    userActionsStats?: CaseUserActionsStats;
    onTypeChange: (type: UserActivityFilter) => void;
}
/**
 * Renders the All / Comments / History selector as a single dropdown filter
 * button (mirroring `SortFilter`) instead of three standalone toggle
 * buttons, so it takes up less horizontal space alongside the author and
 * sort filters.
 */
export declare const TypeFilter: React.NamedExoticComponent<TypeFilterProps>;
export {};
