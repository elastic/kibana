import type { FC } from 'react';
export interface AssignFlyoutActionBarProps {
    resultCount: number;
    initiallyAssigned: number;
    pendingChanges: number;
    onReset: () => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}
export declare const AssignFlyoutActionBar: FC<AssignFlyoutActionBarProps>;
