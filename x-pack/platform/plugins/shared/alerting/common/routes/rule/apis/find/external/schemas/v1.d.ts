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
        id: string;
        type: string;
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
        running?: boolean | null | undefined;
        artifacts?: Readonly<{
            dashboards?: Readonly<{} & {
                id: string;
            }>[] | undefined;
            investigation_guide?: Readonly<{} & {
                blob: string;
            }> | undefined;
        } & {}> | undefined;
        flapping?: Readonly<{
            enabled?: boolean | undefined;
        } & {
            look_back_window: number;
            status_change_threshold: number;
        }> | null | undefined;
        throttle?: string | null | undefined;
        mapped_params?: Record<string, any> | undefined;
        last_run?: Readonly<{
            warning?: "disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt" | "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution" | null | undefined;
            outcome_msg?: string[] | null | undefined;
            outcome_order?: number | undefined;
        } & {
            outcome: "warning" | "failed" | "succeeded";
            alerts_count: Readonly<{
                new?: number | null | undefined;
                active?: number | null | undefined;
                ignored?: number | null | undefined;
                recovered?: number | null | undefined;
            } & {}>;
        }> | null | undefined;
        notify_when?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
        next_run?: string | null | undefined;
        scheduled_task_id?: string | undefined;
        api_key_created_by_user?: boolean | null | undefined;
        alert_delay?: Readonly<{} & {
            active: number;
        }> | undefined;
    } & {
        id: string;
        params: Record<string, any>;
        enabled: boolean;
        name: string;
        actions: Readonly<{
            group?: string | undefined;
            uuid?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                throttle: string | null;
                notify_when: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
            }> | undefined;
            alerts_filter?: Readonly<{
                query?: Readonly<{
                    dsl?: string | undefined;
                } & {
                    filters: Readonly<{
                        query?: Record<string, any> | undefined;
                        $state?: Readonly<{} & {
                            store: import("@kbn/es-query-constants").FilterStateStore;
                        }> | undefined;
                    } & {
                        meta: Record<string, any>;
                    }>[];
                    kql: string;
                }> | undefined;
                timeframe?: Readonly<{} & {
                    timezone: string;
                    days: (1 | 2 | 3 | 5 | 4 | 6 | 7)[];
                    hours: Readonly<{} & {
                        start: string;
                        end: string;
                    }>;
                }> | undefined;
            } & {}> | undefined;
            use_alert_data_for_template?: boolean | undefined;
        } & {
            id: string;
            params: Record<string, any>;
            connector_type_id: string;
        }>[];
        created_at: string;
        created_by: string | null;
        updated_at: string;
        updated_by: string | null;
        tags: string[];
        revision: number;
        consumer: string;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        execution_status: Readonly<{
            error?: Readonly<{} & {
                message: string;
                reason: "disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt";
            }> | undefined;
            warning?: Readonly<{} & {
                message: string;
                reason: "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution";
            }> | undefined;
            last_duration?: number | undefined;
        } & {
            status: "error" | "warning" | "unknown" | "ok" | "active" | "pending";
            last_execution_date: string;
        }>;
        api_key_owner: string | null;
        mute_all: boolean;
        rule_type_id: string;
        muted_alert_ids: string[];
    }>[]>;
}>;
