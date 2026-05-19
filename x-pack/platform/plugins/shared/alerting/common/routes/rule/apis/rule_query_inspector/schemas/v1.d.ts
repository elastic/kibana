export declare const ruleQueryInspectorExamples: () => string;
export declare const ruleQueryInspectorParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const ruleQueryInspectorQuerySchema: import("@kbn/config-schema").ObjectType<{
    mode: import("@kbn/config-schema").Type<"build" | "execute">;
    alert_id: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const ruleQueryInspectorResponseSchema: import("@kbn/config-schema").ObjectType<{
    queries: import("@kbn/config-schema").Type<Readonly<{
        response?: Record<string, any> | undefined;
        label?: string | undefined;
    } & {
        request: Record<string, any>;
        index: string;
    }>[]>;
}>;
