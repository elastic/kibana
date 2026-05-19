import type { FC } from 'react';
import type { TagBulkAction } from '../types';
export interface ActionBarProps {
    actions: TagBulkAction[];
    totalCount: number;
    selectedCount: number;
    onActionSelected: (action: TagBulkAction) => void;
}
export declare const ActionBar: FC<ActionBarProps>;
