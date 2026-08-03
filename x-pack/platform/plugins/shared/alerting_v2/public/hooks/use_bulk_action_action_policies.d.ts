/**
 * The bulk operations exposed by the action-policies list, each backed by its
 * own by-ID endpoint. All share the same `BulkResponse` contract; `snooze`
 * additionally carries the shared expiry.
 */
export type BulkActionActionPoliciesVariables = {
    action: 'enable' | 'disable' | 'delete' | 'unsnooze' | 'update_api_key';
    ids: string[];
} | {
    action: 'snooze';
    ids: string[];
    snoozedUntil: string;
};
export declare const useBulkActionActionPolicies: () => import("@tanstack/react-query").UseMutationResult<{
    affected_count: number;
    errors: {
        id: string;
        error: {
            message: string;
            code: string;
            details?: Record<string, unknown> | undefined;
        };
    }[];
}, Error, BulkActionActionPoliciesVariables, unknown>;
