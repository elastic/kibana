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
    enabled: boolean;
    id: string;
    status: "error" | "pending" | "timeout" | "complete" | "running";
    start: string;
    rule: Readonly<{
        apiKeyCreatedByUser?: boolean | null | undefined;
    } & {
        enabled: boolean;
        id: string;
        name: string;
        actions: Readonly<{
            uuid?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                throttle: string | null;
                notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
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
                    days: (2 | 1 | 4 | 6 | 5 | 3 | 7)[];
                    hours: Readonly<{} & {
                        end: string;
                        start: string;
                    }>;
                }> | undefined;
            } & {}> | undefined;
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            id: string;
            group: string;
            params: Record<string, any>;
            actionTypeId: string;
        }>[];
        params: Record<string, any>;
        tags: string[];
        createdAt: string;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        consumer: string;
        revision: number;
        updatedAt: string;
        createdBy: string | null;
        updatedBy: string | null;
        alertTypeId: string;
        apiKeyOwner: string | null;
    }>;
    duration: string;
    spaceId: string;
    createdAt: string;
    schedule: Readonly<{} & {
        status: "error" | "pending" | "timeout" | "complete" | "running";
        interval: string;
        runAt: string;
    }>[];
    initiator: "user" | "system";
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
    warnings?: string[] | undefined;
    initiatorId?: string | undefined;
} & {
    enabled: boolean;
    id: string;
    status: "error" | "pending" | "timeout" | "complete" | "running";
    start: string;
    rule: Readonly<{
        apiKeyCreatedByUser?: boolean | null | undefined;
    } & {
        enabled: boolean;
        id: string;
        name: string;
        actions: Readonly<{
            uuid?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                throttle: string | null;
                notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
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
                    days: (2 | 1 | 4 | 6 | 5 | 3 | 7)[];
                    hours: Readonly<{} & {
                        end: string;
                        start: string;
                    }>;
                }> | undefined;
            } & {}> | undefined;
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            id: string;
            group: string;
            params: Record<string, any>;
            actionTypeId: string;
        }>[];
        params: Record<string, any>;
        tags: string[];
        createdAt: string;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        consumer: string;
        revision: number;
        updatedAt: string;
        createdBy: string | null;
        updatedBy: string | null;
        alertTypeId: string;
        apiKeyOwner: string | null;
    }>;
    duration: string;
    spaceId: string;
    createdAt: string;
    schedule: Readonly<{} & {
        status: "error" | "pending" | "timeout" | "complete" | "running";
        interval: string;
        runAt: string;
    }>[];
    initiator: "user" | "system";
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
