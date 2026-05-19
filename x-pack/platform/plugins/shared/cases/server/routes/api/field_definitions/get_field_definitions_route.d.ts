/**
 * GET /internal/cases/field-definitions
 * List all field definitions for the given owner(s)
 */
export declare const getFieldDefinitionsRoute: import("../types").CaseRoute<{}, {
    owner?: "cases" | "observability" | "securitySolution" | ("cases" | "observability" | "securitySolution")[] | undefined;
}, {}>;
