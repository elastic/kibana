import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import React from 'react';
interface ActionPolicyActionsCellProps {
    policy: ActionPolicyResponse;
    canWrite: boolean;
    onViewDetails: (policy: ActionPolicyResponse) => void;
    onEdit: (id: string) => void;
    onClone: (policy: ActionPolicyResponse) => void;
    onDelete: (policy: ActionPolicyResponse) => void;
    onSnooze: (id: string, snoozedUntil: string) => void;
    onCancelSnooze: (id: string) => void;
    onUpdateApiKey: (id: string) => void;
    isDisabled?: boolean;
}
export declare const ActionPolicyActionsCell: ({ policy, canWrite, onViewDetails, onEdit, onClone, onDelete, onSnooze, onCancelSnooze, onUpdateApiKey, isDisabled, }: ActionPolicyActionsCellProps) => React.JSX.Element;
export {};
