export declare const findRulesInternalRequestBodySchema: import("@kbn/config-schema").ObjectType<{
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
    fields: import("@kbn/config-schema").Type<string[] | undefined>;
    filter: import("@kbn/config-schema").Type<string | undefined>;
    rule_type_ids: import("@kbn/config-schema").Type<string[] | undefined>;
    consumers: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const findRulesInternalResponseSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        mapped_params?: Record<string, any> | undefined;
        scheduled_task_id?: string | undefined;
        created_by_profile_uid?: string | null | undefined;
        updated_by_profile_uid?: string | null | undefined;
        api_key_owner_profile_uid?: string | null | undefined;
        api_key_created_by_user?: boolean | null | undefined;
        throttle?: string | null | undefined;
        notify_when?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
        monitoring?: Readonly<{} & {
            run: Readonly<{} & {
                history: Readonly<{
                    duration?: number | undefined;
                    outcome?: "failed" | "succeeded" | "warning" | undefined;
                } & {
                    success: boolean;
                    timestamp: number;
                }>[];
                calculated_metrics: Readonly<{
                    p50?: number | undefined;
                    p95?: number | undefined;
                    p99?: number | undefined;
                } & {
                    success_ratio: number;
                }>;
                last_run: Readonly<{} & {
                    timestamp: string;
                    metrics: Readonly<{
                        duration?: number | undefined;
                        total_search_duration_ms?: number | null | undefined;
                        total_indexing_duration_ms?: number | null | undefined;
                        total_alerts_detected?: number | null | undefined;
                        total_alerts_created?: number | null | undefined;
                        gap_duration_s?: number | null | undefined;
                        gap_range?: Readonly<{} & {
                            lte: string;
                            gte: string;
                        }> | null | undefined;
                    } & {}>;
                }>;
            }>;
        }> | undefined;
        snooze_schedule?: Readonly<{
            id?: string | undefined;
            skipRecurrences?: string[] | undefined;
        } & {
            duration: number;
            rRule: Readonly<{
                freq?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined;
                until?: string | undefined;
                count?: number | undefined;
                interval?: number | undefined;
                wkst?: "FR" | "MO" | "SA" | "SU" | "TH" | "TU" | "WE" | undefined;
                byweekday?: (string | number)[] | null | undefined;
                bymonth?: number[] | null | undefined;
                bysetpos?: number[] | null | undefined;
                bymonthday?: number[] | null | undefined;
                byyearday?: number[] | null | undefined;
                byweekno?: number[] | null | undefined;
                byhour?: number[] | null | undefined;
                byminute?: number[] | null | undefined;
                bysecond?: number[] | null | undefined;
            } & {
                dtstart: string;
                tzid: string;
            }>;
        }>[] | undefined;
        active_snoozes?: string[] | undefined;
        snoozed_alert_instances?: Readonly<{
            expires_at?: string | undefined;
            conditions?: (Readonly<{} & {
                type: "field_change";
                field: string;
            }> | Readonly<{} & {
                type: "severity_change";
            }> | Readonly<{} & {
                type: "severity_equals";
                value: import("@kbn/rule-data-utils").AlertSeverity;
            }>)[] | undefined;
            condition_operator?: "all" | "any" | undefined;
        } & {
            instance_id: string;
            snoozed_at: string;
            snoozed_by: string;
        }>[] | undefined;
        is_snoozed_until?: string | null | undefined;
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
        view_in_app_relative_url?: string | null | undefined;
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
