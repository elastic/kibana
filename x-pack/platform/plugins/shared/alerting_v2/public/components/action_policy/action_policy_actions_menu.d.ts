import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import React from 'react';
interface Props {
    policy: ActionPolicyResponse;
    onViewDetails?: (policy: ActionPolicyResponse) => void;
    onEdit?: (id: string) => void;
    onClone: (policy: ActionPolicyResponse) => void;
    onDelete: (policy: ActionPolicyResponse) => void;
    onEnable: (id: string) => void;
    onDisable: (id: string) => void;
    onSnooze: (id: string, snoozedUntil: string) => void;
    onCancelSnooze: (id: string) => void;
    onUpdateApiKey: (id: string) => void;
    isStateLoading: boolean;
    isDisabled?: boolean;
    'data-test-subj'?: string;
}
export declare const ActionPolicyActionsMenu: ({ policy, onViewDetails, onEdit, onClone, onDelete, onEnable, onDisable, onSnooze, onCancelSnooze, onUpdateApiKey, isStateLoading, isDisabled, "data-test-subj": dataTestSubj, }: Props) => React.JSX.Element;
export {};
