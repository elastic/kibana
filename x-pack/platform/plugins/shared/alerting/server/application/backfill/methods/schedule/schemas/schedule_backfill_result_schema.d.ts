export declare const scheduleBackfillErrorSchema: import("@kbn/config-schema").ObjectType<{
    error: import("@kbn/config-schema").ObjectType<{
        message: import("@kbn/config-schema").Type<string>;
        status: import("@kbn/config-schema").Type<number | undefined>;
        rule: import("@kbn/config-schema").ObjectType<{
            id: import("@kbn/config-schema").Type<string>;
            name: import("@kbn/config-schema").Type<string | undefined>;
        }>;
    }>;
}>;
export declare const scheduleBackfillResultSchema: import("@kbn/config-schema").Type<Readonly<{
    end?: string | undefined;
    initiatorId?: string | undefined;
    warnings?: string[] | undefined;
} & {
    id: string;
    createdAt: string;
    duration: string;
    enabled: boolean;
    rule: Readonly<{
        apiKeyCreatedByUser?: boolean | null | undefined;
    } & {
        id: string;
        name: string;
        tags: string[];
        actions: Readonly<{
            uuid?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
                throttle: string | null;
            }> | undefined;
            alertsFilter?: Readonly<{
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
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            group: string;
            id: string;
            actionTypeId: string;
            params: Record<string, any>;
        }>[];
        alertTypeId: string;
        params: Record<string, any>;
        apiKeyOwner: string | null;
        consumer: string;
        enabled: boolean;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: string;
        updatedAt: string;
        revision: number;
    }>;
    spaceId: string;
    start: string;
    status: "complete" | "error" | "pending" | "running" | "timeout";
    schedule: Readonly<{} & {
        runAt: string;
        status: "complete" | "error" | "pending" | "running" | "timeout";
        interval: string;
    }>[];
    initiator: "system" | "user";
}> | Readonly<{} & {
    error: Readonly<{
        status?: number | undefined;
    } & {
        message: string;
        rule: Readonly<{
            name?: string | undefined;
        } & {
            id: string;
        }>;
    }>;
}>>;
export declare const scheduleBackfillResultsSchema: import("@kbn/config-schema").Type<(Readonly<{
    end?: string | undefined;
    initiatorId?: string | undefined;
    warnings?: string[] | undefined;
} & {
    id: string;
    createdAt: string;
    duration: string;
    enabled: boolean;
    rule: Readonly<{
        apiKeyCreatedByUser?: boolean | null | undefined;
    } & {
        id: string;
        name: string;
        tags: string[];
        actions: Readonly<{
            uuid?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
                throttle: string | null;
            }> | undefined;
            alertsFilter?: Readonly<{
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
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            group: string;
            id: string;
            actionTypeId: string;
            params: Record<string, any>;
        }>[];
        alertTypeId: string;
        params: Record<string, any>;
        apiKeyOwner: string | null;
        consumer: string;
        enabled: boolean;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: string;
        updatedAt: string;
        revision: number;
    }>;
    spaceId: string;
    start: string;
    status: "complete" | "error" | "pending" | "running" | "timeout";
    schedule: Readonly<{} & {
        runAt: string;
        status: "complete" | "error" | "pending" | "running" | "timeout";
        interval: string;
    }>[];
    initiator: "system" | "user";
}> | Readonly<{} & {
    error: Readonly<{
        status?: number | undefined;
    } & {
        message: string;
        rule: Readonly<{
            name?: string | undefined;
        } & {
            id: string;
        }>;
    }>;
}>)[]>;
