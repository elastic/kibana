export declare const getRuleParamsExamples: () => string;
export declare const getRuleRequestParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const getRuleResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    name: import("@kbn/config-schema").Type<string>;
    tags: import("@kbn/config-schema").Type<string[]>;
    rule_type_id: import("@kbn/config-schema").Type<string>;
    consumer: import("@kbn/config-schema").Type<string>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
    }>;
    actions: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
    mapped_params: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    scheduled_task_id: import("@kbn/config-schema").Type<string | undefined>;
    created_by: import("@kbn/config-schema").Type<string | null>;
    updated_by: import("@kbn/config-schema").Type<string | null>;
    created_at: import("@kbn/config-schema").Type<string>;
    updated_at: import("@kbn/config-schema").Type<string>;
    api_key_owner: import("@kbn/config-schema").Type<string | null>;
    api_key_created_by_user: import("@kbn/config-schema").Type<boolean | null | undefined>;
    throttle: import("@kbn/config-schema").Type<string | null | undefined>;
    mute_all: import("@kbn/config-schema").Type<boolean>;
    notify_when: import("@kbn/config-schema").Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    muted_alert_ids: import("@kbn/config-schema").Type<string[]>;
    execution_status: import("@kbn/config-schema").ObjectType<{
        status: import("@kbn/config-schema").Type<"active" | "error" | "ok" | "pending" | "unknown" | "warning">;
        last_execution_date: import("@kbn/config-schema").Type<string>;
        last_duration: import("@kbn/config-schema").Type<number | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            reason: "decrypt" | "disabled" | "execute" | "license" | "read" | "timeout" | "unknown" | "validate";
            message: string;
        }> | undefined>;
        warning: import("@kbn/config-schema").Type<Readonly<{} & {
            reason: "maxAlerts" | "maxExecutableActions" | "maxQueuedActions" | "ruleExecution";
            message: string;
        }> | undefined>;
    }>;
    last_run: import("@kbn/config-schema").Type<Readonly<{
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
    }> | null | undefined>;
    next_run: import("@kbn/config-schema").Type<string | null | undefined>;
    revision: import("@kbn/config-schema").Type<number>;
    running: import("@kbn/config-schema").Type<boolean | null | undefined>;
    alert_delay: import("@kbn/config-schema").Type<Readonly<{} & {
        active: number;
    }> | undefined>;
    flapping: import("@kbn/config-schema").Type<Readonly<{
        enabled?: boolean | undefined;
    } & {
        look_back_window: number;
        status_change_threshold: number;
    }> | null | undefined>;
    artifacts: import("@kbn/config-schema").Type<Readonly<{
        dashboards?: Readonly<{} & {
            id: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined>;
}>;
