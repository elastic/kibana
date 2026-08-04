import React from 'react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { useBulkActionActionPolicies } from '../../../hooks/use_bulk_action_action_policies';
type BulkActionMutate = ReturnType<typeof useBulkActionActionPolicies>['mutate'];
interface Props {
    canWrite: boolean;
    isEnabling: boolean;
    enableVariables: string | undefined;
    isDisabling: boolean;
    disableVariables: string | undefined;
    isSnoozing: boolean;
    snoozeVariables: {
        id: string;
    } | undefined;
    isUnsnoozing: boolean;
    unsnoozeVariables: string | undefined;
    isBulkActionInProgress: boolean;
    bulkAction: BulkActionMutate;
    onRefetchReady: (refetch: () => void) => void;
    onEdit: (id: string) => void;
    onClone: (policy: ActionPolicyResponse) => void;
    onDelete: (policy: ActionPolicyResponse) => void;
    onSnooze: (id: string, snoozedUntil: string) => void;
    onCancelSnooze: (id: string) => void;
    onUpdateApiKey: (id: string) => void;
    enablePolicy: (id: string) => void;
    disablePolicy: (id: string) => void;
}
export declare const ENABLED_FILTER_OPTIONS: ({
    key: "enabled";
    label: string;
} | {
    key: "disabled";
    label: string;
})[];
export declare const ActionPoliciesTableContent: ({ canWrite, isEnabling, enableVariables, isDisabling, disableVariables, isSnoozing, snoozeVariables, isUnsnoozing, unsnoozeVariables, isBulkActionInProgress, bulkAction, onRefetchReady, onEdit, onClone, onDelete, onSnooze, onCancelSnooze, onUpdateApiKey, enablePolicy, disablePolicy, }: Props) => React.JSX.Element;
export {};
