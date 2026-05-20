/**
 * POST /internal/cases/templates/_bulk_delete
 * Bulk soft delete templates by IDs
 */
export declare const bulkDeleteTemplatesRoute: import("../types").CaseRoute<unknown, unknown, Readonly<{} & {
    ids: string[];
}>>;
