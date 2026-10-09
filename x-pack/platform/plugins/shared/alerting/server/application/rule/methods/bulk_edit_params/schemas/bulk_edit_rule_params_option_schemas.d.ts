export declare const bulkEditParamsOperationSchema: import("@kbn/config-schema").ObjectType<{
    operation: import("@kbn/config-schema").Type<"set">;
    field: import("@kbn/config-schema").Type<"exceptionsList" | "investigationFields" | "note" | "ruleSource">;
    value: import("@kbn/config-schema").Type<any>;
}>;
export declare const bulkEditParamsOperationsSchema: import("@kbn/config-schema").Type<Readonly<{
    value?: any;
} & {
    operation: "set";
    field: "exceptionsList" | "investigationFields" | "note" | "ruleSource";
}>[]>;
export declare const bulkEditRuleParamsOptionsSchema: import("@kbn/config-schema").ObjectType<{
    filter: import("@kbn/config-schema").Type<string | undefined>;
    ids: import("@kbn/config-schema").Type<string[] | undefined>;
    operations: import("@kbn/config-schema").Type<Readonly<{
        value?: any;
    } & {
        operation: "set";
        field: "exceptionsList" | "investigationFields" | "note" | "ruleSource";
    }>[]>;
}>;
export declare const bulkEditRuleParamsOperationSchema: import("@kbn/config-schema").ObjectType<{
    operation: import("@kbn/config-schema").Type<"set">;
    field: import("@kbn/config-schema").Type<"params.exceptionsList" | "params.investigationFields" | "params.note" | "params.ruleSource">;
    value: import("@kbn/config-schema").Type<any>;
}>;
export declare const bulkEditRuleParamsOperationsSchema: import("@kbn/config-schema").Type<Readonly<{
    value?: any;
} & {
    operation: "set";
    field: "params.exceptionsList" | "params.investigationFields" | "params.note" | "params.ruleSource";
}>[]>;
