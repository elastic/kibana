import type { ConfigType } from '../../../config';
/**
 * Register field definition routes conditionally, based on feature flag
 */
export declare const getFieldDefinitionRoutes: (config: ConfigType) => (import("../types").CaseRoute<unknown, unknown, unknown> | import("../types").CaseRoute<{}, {
    owner?: "observability" | "cases" | "securitySolution" | ("observability" | "cases" | "securitySolution")[] | undefined;
}, {}>)[];
