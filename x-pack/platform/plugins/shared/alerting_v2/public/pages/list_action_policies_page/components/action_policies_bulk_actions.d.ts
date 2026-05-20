import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import React from 'react';
type BulkAction = 'enable' | 'disable' | 'delete' | 'snooze' | 'unsnooze' | 'update_api_key';
interface ActionPoliciesBulkActionsProps {
    selectedPolicies: ActionPolicyResponse[];
    onClearSelection: () => void;
    onBulkAction: (action: BulkAction, snoozedUntil?: string) => void;
    isLoading: boolean;
}
export declare const ActionPoliciesBulkActions: ({ selectedPolicies, onClearSelection, onBulkAction, isLoading, }: ActionPoliciesBulkActionsProps) => React.JSX.Element;
export {};
