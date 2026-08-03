import type { BulkResponse } from '@kbn/alerting-v2-schemas';
export declare const uniqueByGroup: <T extends {
    group_hash: string;
}>(items: T[]) => T[];
/**
 * Builds the toast for a bulk alert-action response. `affected_count` is how
 * many actions the server applied and `errors` holds the per-item failures, so
 * the total attempted is `affected_count + errors.length`; a non-empty `errors`
 * array therefore downgrades the toast from success to a partial-success
 * warning.
 */
export declare const successOrPartialToast: ({ affected_count: processed, errors, }: BulkResponse) => {
    title: string;
    color: "success" | "warning";
};
