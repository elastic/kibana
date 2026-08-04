export declare const snoozeAlertInstanceBodySchema: import("@kbn/config-schema").ObjectType<{
    expiresAt: import("@kbn/config-schema").Type<string | undefined>;
    conditions: import("@kbn/config-schema").Type<(Readonly<{} & {
        type: "field_change";
        field: string;
    }> | Readonly<{} & {
        type: "severity_change";
    }> | Readonly<{} & {
        value: import("@kbn/rule-data-utils").AlertSeverity;
        type: "severity_equals";
    }>)[] | undefined>;
    conditionOperator: import("@kbn/config-schema").Type<"all" | "any" | undefined>;
}>;
