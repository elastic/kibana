import type { BulkActionActionPoliciesResponse } from '../services/action_policies_api';
export declare const useBulkActionActionPolicies: () => import("@kbn/react-query").UseMutationResult<BulkActionActionPoliciesResponse, Error, {
    actions: ({
        id: string;
        action: "enable";
    } | {
        id: string;
        action: "disable";
    } | {
        id: string;
        action: "snooze";
        snoozedUntil: string;
    } | {
        id: string;
        action: "unsnooze";
    } | {
        id: string;
        action: "delete";
    } | {
        id: string;
        action: "update_api_key";
    })[];
}, unknown>;
