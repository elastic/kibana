import React from 'react';
import type { UserActivitySortOrder } from '../../../../user_actions_activity_bar/types';
interface SortFilterProps {
    sortOrder: UserActivitySortOrder;
    isLoading?: boolean;
    onSortOrderChange: (sortOrder: UserActivitySortOrder) => void;
}
/**
 * Renders sort order (Newest first / Oldest first) as a dropdown filter
 * button, so it can live inside the same `EuiFilterGroup` as the type and
 * author filters instead of the standalone `EuiSelect` used by the
 * (classic) `UserActionsActivityBar`.
 */
export declare const SortFilter: React.NamedExoticComponent<SortFilterProps>;
export {};
