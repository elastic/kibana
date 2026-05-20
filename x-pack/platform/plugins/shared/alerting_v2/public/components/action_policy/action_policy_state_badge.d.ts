import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import React from 'react';
interface ActionPolicyStateBadgeProps {
    policy: ActionPolicyResponse;
    isLoading: boolean;
}
export declare const ActionPolicyStateBadge: ({ policy, isLoading }: ActionPolicyStateBadgeProps) => React.JSX.Element;
export {};
