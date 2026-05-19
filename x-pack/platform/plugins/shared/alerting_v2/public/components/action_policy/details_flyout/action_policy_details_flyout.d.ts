import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import React from 'react';
interface Props {
    policy: ActionPolicyResponse;
    onClose: () => void;
    onEdit: (id: string) => void;
    onClone: (policy: ActionPolicyResponse) => void;
    onDelete: (policy: ActionPolicyResponse) => void;
    onEnable: (id: string) => void;
    onDisable: (id: string) => void;
    onSnooze: (id: string, snoozedUntil: string) => void;
    onCancelSnooze: (id: string) => void;
    onUpdateApiKey: (id: string) => void;
    isStateLoading?: boolean;
}
export declare const ActionPolicyDetailsFlyout: ({ policy, onClose, onEdit, onClone, onDelete, onEnable, onDisable, onSnooze, onCancelSnooze, onUpdateApiKey, isStateLoading, }: Props) => React.JSX.Element;
export {};
