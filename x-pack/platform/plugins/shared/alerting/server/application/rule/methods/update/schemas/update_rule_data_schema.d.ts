export declare const updateRuleDataSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    tags: import("@kbn/config-schema").Type<string[]>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
    }>;
    throttle: import("@kbn/config-schema").Type<string | null | undefined>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
    actions: import("@kbn/config-schema").Type<Readonly<{
        uuid?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            throttle: string | null;
            notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        }> | undefined;
        actionTypeId?: string | undefined;
        alertsFilter?: Readonly<{
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
        useAlertDataForTemplate?: boolean | undefined;
    } & {
        id: string;
        params: Record<string, any>;
        group: string;
    }>[]>;
    systemActions: import("@kbn/config-schema").Type<Readonly<{
        uuid?: string | undefined;
        actionTypeId?: string | undefined;
    } & {
        id: string;
        params: Record<string, any>;
    }>[] | undefined>;
    notifyWhen: import("@kbn/config-schema").Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    alertDelay: import("@kbn/config-schema").Type<Readonly<{} & {
        active: number;
    }> | undefined>;
    flapping: import("@kbn/config-schema").Type<Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
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
