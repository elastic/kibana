import { FilterStateStore } from '@kbn/es-query';
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
                        store: FilterStateStore;
                    }> | undefined;
                } & {
                    meta: Readonly<{
                        index?: string | undefined;
                        type?: string | undefined;
                        params?: any;
                        key?: string | undefined;
                        value?: string | undefined;
                        group?: string | undefined;
                        disabled?: boolean | undefined;
                        field?: string | undefined;
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
        params: Record<string, any>;
        uuid: string;
        actionRef: string;
        actionTypeId: string;
    }>[] | undefined>;
}>;
export declare const rawAdHocRunParamsSchema: import("@kbn/config-schema").ObjectType<Omit<{
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
    status: import("@kbn/config-schema").Type<"complete" | "error" | "pending" | "timeout" | "running">;
    schedule: import("@kbn/config-schema").Type<Readonly<{} & {
        status: "complete" | "error" | "pending" | "timeout" | "running";
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
                            store: FilterStateStore;
                        }> | undefined;
                    } & {
                        meta: Readonly<{
                            index?: string | undefined;
                            type?: string | undefined;
                            params?: any;
                            key?: string | undefined;
                            value?: string | undefined;
                            group?: string | undefined;
                            disabled?: boolean | undefined;
                            field?: string | undefined;
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
            params: Record<string, any>;
            uuid: string;
            actionRef: string;
            actionTypeId: string;
        }>[] | undefined>;
    }>;
}>;
