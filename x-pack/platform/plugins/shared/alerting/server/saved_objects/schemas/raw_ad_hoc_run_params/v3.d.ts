export declare const initiatorSchema: import("@kbn/config-schema").Type<"system" | "user">;
export declare const rawAdHocRunParamsRuleSchema: import("@kbn/config-schema").ObjectType<Omit<{
    name: import("@kbn/config-schema").Type<string>;
    tags: import("@kbn/config-schema").Type<string[]>;
    alertTypeId: import("@kbn/config-schema").Type<string>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
    apiKeyOwner: import("@kbn/config-schema").Type<string | null>;
    apiKeyCreatedByUser: import("@kbn/config-schema").Type<boolean | null | undefined>;
    consumer: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
    }>;
    createdBy: import("@kbn/config-schema").Type<string | null>;
    updatedBy: import("@kbn/config-schema").Type<string | null>;
    updatedAt: import("@kbn/config-schema").Type<string>;
    createdAt: import("@kbn/config-schema").Type<string>;
    revision: import("@kbn/config-schema").Type<number>;
}, "actions"> & {
    actions: import("@kbn/config-schema").Type<Readonly<{
        group?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            throttle: string | null;
            notifyWhen: "onActiveAlert" | "onThrottleInterval" | "onActionGroupChange";
        }> | undefined;
        alertsFilter?: Readonly<{
            query?: Readonly<{} & {
                filters: Readonly<{
                    query?: Record<string, any> | undefined;
                    $state?: Readonly<{} & {
                        store: import("@kbn/es-query-constants").FilterStateStore;
                    }> | undefined;
                } & {
                    meta: Readonly<{
                        type?: string | undefined;
                        index?: string | undefined;
                        key?: string | undefined;
                        value?: string | undefined;
                        disabled?: boolean | undefined;
                        group?: string | undefined;
                        field?: string | undefined;
                        params?: any;
                        alias?: string | null | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        relation?: "AND" | "OR" | undefined;
                    } & {}>;
                }>[];
                kql: string;
                dsl: string;
            }> | undefined;
            timeframe?: Readonly<{} & {
                timezone: string;
                days: (2 | 1 | 4 | 5 | 3 | 6 | 7)[];
                hours: Readonly<{} & {
                    end: string;
                    start: string;
                }>;
            }> | undefined;
        } & {}> | undefined;
        useAlertDataForTemplate?: boolean | undefined;
    } & {
        params: Record<string, any>;
        actionRef: string;
        actionTypeId: string;
        uuid: string;
    }>[] | undefined>;
}>;
export declare const rawAdHocRunParamsSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    apiKeyId: import("@kbn/config-schema").Type<string>;
    apiKeyToUse: import("@kbn/config-schema").Type<string>;
    createdAt: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    end: import("@kbn/config-schema").Type<string | undefined>;
    rule: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string>;
        tags: import("@kbn/config-schema").Type<string[]>;
        alertTypeId: import("@kbn/config-schema").Type<string>;
        params: import("@kbn/config-schema").Type<Record<string, any>>;
        apiKeyOwner: import("@kbn/config-schema").Type<string | null>;
        apiKeyCreatedByUser: import("@kbn/config-schema").Type<boolean | null | undefined>;
        consumer: import("@kbn/config-schema").Type<string>;
        enabled: import("@kbn/config-schema").Type<boolean>;
        schedule: import("@kbn/config-schema").ObjectType<{
            interval: import("@kbn/config-schema").Type<string>;
        }>;
        createdBy: import("@kbn/config-schema").Type<string | null>;
        updatedBy: import("@kbn/config-schema").Type<string | null>;
        updatedAt: import("@kbn/config-schema").Type<string>;
        createdAt: import("@kbn/config-schema").Type<string>;
        revision: import("@kbn/config-schema").Type<number>;
    }>;
    spaceId: import("@kbn/config-schema").Type<string>;
    start: import("@kbn/config-schema").Type<string>;
    status: import("@kbn/config-schema").Type<"error" | "complete" | "running" | "pending" | "timeout">;
    schedule: import("@kbn/config-schema").Type<Readonly<{} & {
        status: "error" | "complete" | "running" | "pending" | "timeout";
        interval: string;
        runAt: string;
    }>[]>;
}, "rule"> & {
    rule: import("@kbn/config-schema").ObjectType<Omit<{
        name: import("@kbn/config-schema").Type<string>;
        tags: import("@kbn/config-schema").Type<string[]>;
        alertTypeId: import("@kbn/config-schema").Type<string>;
        params: import("@kbn/config-schema").Type<Record<string, any>>;
        apiKeyOwner: import("@kbn/config-schema").Type<string | null>;
        apiKeyCreatedByUser: import("@kbn/config-schema").Type<boolean | null | undefined>;
        consumer: import("@kbn/config-schema").Type<string>;
        enabled: import("@kbn/config-schema").Type<boolean>;
        schedule: import("@kbn/config-schema").ObjectType<{
            interval: import("@kbn/config-schema").Type<string>;
        }>;
        createdBy: import("@kbn/config-schema").Type<string | null>;
        updatedBy: import("@kbn/config-schema").Type<string | null>;
        updatedAt: import("@kbn/config-schema").Type<string>;
        createdAt: import("@kbn/config-schema").Type<string>;
        revision: import("@kbn/config-schema").Type<number>;
    }, "actions"> & {
        actions: import("@kbn/config-schema").Type<Readonly<{
            group?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                throttle: string | null;
                notifyWhen: "onActiveAlert" | "onThrottleInterval" | "onActionGroupChange";
            }> | undefined;
            alertsFilter?: Readonly<{
                query?: Readonly<{} & {
                    filters: Readonly<{
                        query?: Record<string, any> | undefined;
                        $state?: Readonly<{} & {
                            store: import("@kbn/es-query-constants").FilterStateStore;
                        }> | undefined;
                    } & {
                        meta: Readonly<{
                            type?: string | undefined;
                            index?: string | undefined;
                            key?: string | undefined;
                            value?: string | undefined;
                            disabled?: boolean | undefined;
                            group?: string | undefined;
                            field?: string | undefined;
                            params?: any;
                            alias?: string | null | undefined;
                            negate?: boolean | undefined;
                            controlledBy?: string | undefined;
                            isMultiIndex?: boolean | undefined;
                            relation?: "AND" | "OR" | undefined;
                        } & {}>;
                    }>[];
                    kql: string;
                    dsl: string;
                }> | undefined;
                timeframe?: Readonly<{} & {
                    timezone: string;
                    days: (2 | 1 | 4 | 5 | 3 | 6 | 7)[];
                    hours: Readonly<{} & {
                        end: string;
                        start: string;
                    }>;
                }> | undefined;
            } & {}> | undefined;
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            params: Record<string, any>;
            actionRef: string;
            actionTypeId: string;
            uuid: string;
        }>[] | undefined>;
    }>;
}, "initiator" | "initiatorId"> & {
    initiator: import("@kbn/config-schema").Type<"system" | "user">;
    initiatorId: import("@kbn/config-schema").Type<string | undefined>;
}>;
