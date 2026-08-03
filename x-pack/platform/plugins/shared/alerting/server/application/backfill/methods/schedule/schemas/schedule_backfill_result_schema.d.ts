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
    warnings?: string[] | undefined;
    initiatorId?: string | undefined;
} & {
    id: string;
    rule: Readonly<{
        apiKeyCreatedByUser?: boolean | null | undefined;
    } & {
        id: string;
        params: Record<string, any>;
        enabled: boolean;
        name: string;
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
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            id: string;
            params: Record<string, any>;
            group: string;
            actionTypeId: string;
        }>[];
        tags: string[];
        createdAt: string;
        updatedAt: string;
        createdBy: string | null;
        updatedBy: string | null;
        revision: number;
        consumer: string;
        alertTypeId: string;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        apiKeyOwner: string | null;
    }>;
    enabled: boolean;
    status: "error" | "complete" | "timeout" | "running" | "pending";
    start: string;
    duration: string;
    spaceId: string;
    createdAt: string;
    schedule: Readonly<{} & {
        status: "error" | "complete" | "timeout" | "running" | "pending";
        interval: string;
        runAt: string;
    }>[];
    initiator: "system" | "user";
}> | Readonly<{} & {
    error: Readonly<{
        status?: number | undefined;
    } & {
        rule: Readonly<{
            name?: string | undefined;
        } & {
            id: string;
        }>;
        message: string;
    }>;
}>>;
export declare const scheduleBackfillResultsSchema: import("@kbn/config-schema").Type<(Readonly<{
    end?: string | undefined;
    warnings?: string[] | undefined;
    initiatorId?: string | undefined;
} & {
    id: string;
    rule: Readonly<{
        apiKeyCreatedByUser?: boolean | null | undefined;
    } & {
        id: string;
        params: Record<string, any>;
        enabled: boolean;
        name: string;
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
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            id: string;
            params: Record<string, any>;
            group: string;
            actionTypeId: string;
        }>[];
        tags: string[];
        createdAt: string;
        updatedAt: string;
        createdBy: string | null;
        updatedBy: string | null;
        revision: number;
        consumer: string;
        alertTypeId: string;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        apiKeyOwner: string | null;
    }>;
    enabled: boolean;
    status: "error" | "complete" | "timeout" | "running" | "pending";
    start: string;
    duration: string;
    spaceId: string;
    createdAt: string;
    schedule: Readonly<{} & {
        status: "error" | "complete" | "timeout" | "running" | "pending";
        interval: string;
        runAt: string;
    }>[];
    initiator: "system" | "user";
}> | Readonly<{} & {
    error: Readonly<{
        status?: number | undefined;
    } & {
        rule: Readonly<{
            name?: string | undefined;
        } & {
            id: string;
        }>;
        message: string;
    }>;
}>)[]>;
