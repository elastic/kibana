/**
 * Describes an error during rule building.
 * In addition to a user-"friendly" message, this also includes a rule trace,
 * which is the "JSON path" where the error occurred.
 */
export declare class RuleBuilderError extends Error {
    readonly ruleTrace: string[];
    constructor(message: string, ruleTrace: string[]);
}
