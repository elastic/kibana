import React from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import type { UserActivitySortOrder } from './types';
interface FilterActivityProps {
    isLoading?: boolean;
    sortOrder: UserActivitySortOrder;
    onOrderChange: (sortOrder: UserActivitySortOrder) => void;
}
export declare const sortOptions: EuiSelectOption[];
export declare const SortActivity: React.NamedExoticComponent<FilterActivityProps>;
export {};
