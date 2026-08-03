import type { EuiFlyoutProps } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import React from 'react';
interface Props {
    policy: ActionPolicyResponse;
    canWrite: boolean;
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
    session?: EuiFlyoutProps['session'];
    ownFocus?: EuiFlyoutProps['ownFocus'];
    hasAnimation?: EuiFlyoutProps['hasAnimation'];
}
export declare const ActionPolicyDetailsFlyout: ({ policy, canWrite, onClose, onEdit, onClone, onDelete, onEnable, onDisable, onSnooze, onCancelSnooze, onUpdateApiKey, isStateLoading, session, ownFocus, hasAnimation, }: Props) => React.JSX.Element;
export {};
