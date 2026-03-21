export declare const initiatorSchema: import("@kbn/config-schema").Type<"user" | "system">;
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
            notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
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
                        field?: string | undefined;
                        group?: string | undefined;
                        type?: string | undefined;
                        disabled?: boolean | undefined;
                        value?: string | undefined;
                        key?: string | undefined;
                        index?: string | undefined;
                        params?: any;
                        negate?: boolean | undefined;
                        alias?: string | null | undefined;
                        controlledBy?: string | undefined;
                        relation?: "AND" | "OR" | undefined;
                        isMultiIndex?: boolean | undefined;
                    } & {}>;
                }>[];
                kql: string;
                dsl: string;
            }> | undefined;
            timeframe?: Readonly<{} & {
                timezone: string;
                days: (2 | 1 | 4 | 6 | 5 | 3 | 7)[];
                hours: Readonly<{} & {
                    end: string;
                    start: string;
                }>;
            }> | undefined;
        } & {}> | undefined;
        useAlertDataForTemplate?: boolean | undefined;
    } & {
        params: Record<string, any>;
        uuid: string;
        actionTypeId: string;
        actionRef: string;
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
    status: import("@kbn/config-schema").Type<"error" | "pending" | "timeout" | "complete" | "running">;
    schedule: import("@kbn/config-schema").Type<Readonly<{} & {
        status: "error" | "pending" | "timeout" | "complete" | "running";
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
                notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
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
                            field?: string | undefined;
                            group?: string | undefined;
                            type?: string | undefined;
                            disabled?: boolean | undefined;
                            value?: string | undefined;
                            key?: string | undefined;
                            index?: string | undefined;
                            params?: any;
                            negate?: boolean | undefined;
                            alias?: string | null | undefined;
                            controlledBy?: string | undefined;
                            relation?: "AND" | "OR" | undefined;
                            isMultiIndex?: boolean | undefined;
                        } & {}>;
                    }>[];
                    kql: string;
                    dsl: string;
                }> | undefined;
                timeframe?: Readonly<{} & {
                    timezone: string;
                    days: (2 | 1 | 4 | 6 | 5 | 3 | 7)[];
                    hours: Readonly<{} & {
                        end: string;
                        start: string;
                    }>;
                }> | undefined;
            } & {}> | undefined;
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            params: Record<string, any>;
            uuid: string;
            actionTypeId: string;
            actionRef: string;
        }>[] | undefined>;
    }>;
}, "initiator" | "initiatorId"> & {
    initiator: import("@kbn/config-schema").Type<"user" | "system">;
    initiatorId: import("@kbn/config-schema").Type<string | undefined>;
}>;
