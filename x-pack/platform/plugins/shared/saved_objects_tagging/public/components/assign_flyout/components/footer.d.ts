import type { FC } from 'react';
export interface AssignFlyoutFooterProps {
    isSaving: boolean;
    hasPendingChanges: boolean;
    onCancel: () => void;
    onSave: () => void;
}
export declare const AssignFlyoutFooter: FC<AssignFlyoutFooterProps>;
