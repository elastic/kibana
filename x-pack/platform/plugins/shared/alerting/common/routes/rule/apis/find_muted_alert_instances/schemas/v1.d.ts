export declare const findMutedAlertInstancesRequestBodySchema: import("@kbn/config-schema").ObjectType<{
    per_page: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    filter: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const findMutedAlertInstancesResponseSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        snoozed_alert_instances?: Readonly<{
            conditions?: (Readonly<{} & {
                type: "field_change";
                field: string;
            }> | Readonly<{} & {
                type: "severity_change";
            }> | Readonly<{} & {
                value: import("@kbn/rule-data-utils").AlertSeverity;
                type: "severity_equals";
            }>)[] | undefined;
            expires_at?: string | undefined;
            condition_operator?: "all" | "any" | undefined;
        } & {
            instance_id: string;
            snoozed_at: string;
            snoozed_by: string;
        }>[] | undefined;
    } & {
        id: string;
        muted_alert_instance_ids: string[];
    }>[]>;
}>;
