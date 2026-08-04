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
        status: import("@kbn/config-schema").Type<"error" | "warning" | "unknown" | "ok" | "active" | "pending">;
        last_execution_date: import("@kbn/config-schema").Type<string>;
        last_duration: import("@kbn/config-schema").Type<number | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: "disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt";
        }> | undefined>;
        warning: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution";
        }> | undefined>;
    }>;
    last_run: import("@kbn/config-schema").Type<Readonly<{
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
