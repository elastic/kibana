export declare const findRuleParamsExamples: () => string;
export declare const findRulesRequestQuerySchema: import("@kbn/config-schema").ObjectType<{
    per_page: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    default_search_operator: import("@kbn/config-schema").Type<"AND" | "OR">;
    search_fields: import("@kbn/config-schema").Type<string | string[] | undefined>;
    sort_field: import("@kbn/config-schema").Type<string | undefined>;
    sort_order: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    has_reference: import("@kbn/config-schema").Type<Readonly<{} & {
        type: string;
        id: string;
    }> | null | undefined>;
    fields: import("@kbn/config-schema").Type<string | string[] | undefined>;
    filter: import("@kbn/config-schema").Type<string | undefined>;
    filter_consumers: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const findRulesResponseSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        mapped_params?: Record<string, any> | undefined;
        scheduled_task_id?: string | undefined;
        api_key_created_by_user?: boolean | null | undefined;
        throttle?: string | null | undefined;
        notify_when?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
        last_run?: Readonly<{
            outcome_order?: number | undefined;
            warning?: "decrypt" | "disabled" | "execute" | "license" | "maxAlerts" | "maxExecutableActions" | "maxQueuedActions" | "read" | "ruleExecution" | "timeout" | "unknown" | "validate" | null | undefined;
            outcome_msg?: string[] | null | undefined;
        } & {
            outcome: "failed" | "succeeded" | "warning";
            alerts_count: Readonly<{
                active?: number | null | undefined;
                new?: number | null | undefined;
                recovered?: number | null | undefined;
                ignored?: number | null | undefined;
            } & {}>;
        }> | null | undefined;
        next_run?: string | null | undefined;
        running?: boolean | null | undefined;
        alert_delay?: Readonly<{} & {
            active: number;
        }> | undefined;
        flapping?: Readonly<{
            enabled?: boolean | undefined;
        } & {
            look_back_window: number;
            status_change_threshold: number;
        }> | null | undefined;
        artifacts?: Readonly<{
            dashboards?: Readonly<{} & {
                id: string;
            }>[] | undefined;
            investigation_guide?: Readonly<{} & {
                blob: string;
            }> | undefined;
        } & {}> | undefined;
    } & {
        id: string;
        enabled: boolean;
        name: string;
        tags: string[];
        rule_type_id: string;
        consumer: string;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        actions: Readonly<{
            uuid?: string | undefined;
            group?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                notify_when: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
                throttle: string | null;
            }> | undefined;
            alerts_filter?: Readonly<{
                query?: Readonly<{
                    dsl?: string | undefined;
                } & {
                    kql: string;
                    filters: Readonly<{
                        query?: Record<string, any> | undefined;
                        $state?: Readonly<{} & {
                            store: import("@kbn/es-query-constants").FilterStateStore;
                        }> | undefined;
                    } & {
                        meta: Record<string, any>;
                    }>[];
                }> | undefined;
                timeframe?: Readonly<{} & {
                    days: (1 | 2 | 3 | 4 | 5 | 6 | 7)[];
                    hours: Readonly<{} & {
                        start: string;
                        end: string;
                    }>;
                    timezone: string;
                }> | undefined;
            } & {}> | undefined;
            use_alert_data_for_template?: boolean | undefined;
        } & {
            id: string;
            connector_type_id: string;
            params: Record<string, any>;
        }>[];
        params: Record<string, any>;
        created_by: string | null;
        updated_by: string | null;
        created_at: string;
        updated_at: string;
        api_key_owner: string | null;
        mute_all: boolean;
        muted_alert_ids: string[];
        execution_status: Readonly<{
            last_duration?: number | undefined;
            error?: Readonly<{} & {
                reason: "decrypt" | "disabled" | "execute" | "license" | "read" | "timeout" | "unknown" | "validate";
                message: string;
            }> | undefined;
            warning?: Readonly<{} & {
                reason: "maxAlerts" | "maxExecutableActions" | "maxQueuedActions" | "ruleExecution";
                message: string;
            }> | undefined;
        } & {
            status: "active" | "error" | "ok" | "pending" | "unknown" | "warning";
            last_execution_date: string;
        }>;
        revision: number;
    }>[]>;
}>;
