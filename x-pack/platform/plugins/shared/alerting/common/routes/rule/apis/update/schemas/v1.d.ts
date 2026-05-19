export declare const updateRuleParamsExamples: () => string;
export declare const actionFrequencySchema: import("@kbn/config-schema").ObjectType<{
    summary: import("@kbn/config-schema").Type<boolean>;
    notify_when: import("@kbn/config-schema").Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval">;
    throttle: import("@kbn/config-schema").Type<string | null>;
}>;
export declare const actionAlertsFilterSchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").Type<Readonly<{
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
    }> | undefined>;
    timeframe: import("@kbn/config-schema").Type<Readonly<{} & {
        days: (2 | 1 | 3 | 7 | 5 | 4 | 6)[];
        hours: Readonly<{} & {
            start: string;
            end: string;
        }>;
        timezone: string;
    }> | undefined>;
}>;
export declare const actionSchema: import("@kbn/config-schema").ObjectType<{
    group: import("@kbn/config-schema").Type<string | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
    frequency: import("@kbn/config-schema").Type<Readonly<{} & {
        summary: boolean;
        throttle: string | null;
        notify_when: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
    }> | undefined>;
    uuid: import("@kbn/config-schema").Type<string | undefined>;
    alerts_filter: import("@kbn/config-schema").Type<Readonly<{
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
            days: (2 | 1 | 3 | 7 | 5 | 4 | 6)[];
            hours: Readonly<{} & {
                start: string;
                end: string;
            }>;
            timezone: string;
        }> | undefined;
    } & {}> | undefined>;
    use_alert_data_for_template: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const findRuleParamsExamples: () => string;
export declare const updateBodySchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    tags: import("@kbn/config-schema").Type<string[]>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
    }>;
    throttle: import("@kbn/config-schema").Type<string | null | undefined>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
    actions: import("@kbn/config-schema").Type<Readonly<{
        uuid?: string | undefined;
        group?: string | undefined;
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
                days: (2 | 1 | 3 | 7 | 5 | 4 | 6)[];
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
        params: Record<string, any>;
    }>[]>;
    notify_when: import("@kbn/config-schema").Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
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
export declare const updateParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
