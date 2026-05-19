/**
 * GET /internal/cases/templates/{template_id}
 * Get a single template by ID
 */
export declare const getTemplateRoute: import("../types").CaseRoute<Readonly<{} & {
    template_id: string;
}>, Readonly<{
    version?: number | undefined;
    includeDeleted?: boolean | undefined;
} & {}>, unknown>;
