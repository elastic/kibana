/**
 * Used by the security solution
 */
export declare const validFields: {
    readonly EXCEPTIONS_LIST: "exceptionsList";
    readonly RULE_SOURCE: "ruleSource";
};
export type ValidReadAuthEditFields = (typeof validFields)[keyof typeof validFields];
