import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import React from 'react';
interface ActionPolicySnoozePopoverProps {
    policy: ActionPolicyResponse;
    onSnooze: (id: string, snoozedUntil: string) => void;
    onCancelSnooze: (id: string) => void;
    isLoading: boolean;
    isDisabled?: boolean;
}
export declare const ActionPolicySnoozePopover: ({ policy, onSnooze, onCancelSnooze, isLoading, isDisabled, }: ActionPolicySnoozePopoverProps) => React.JSX.Element;
export {};
