export declare const statusSchema: import("@kbn/config-schema").Type<"error" | "complete" | "running" | "pending" | "timeout">;
export declare const backfillScheduleSchema: import("@kbn/config-schema").ObjectType<{
    runAt: import("@kbn/config-schema").Type<string>;
    status: import("@kbn/config-schema").Type<"error" | "complete" | "running" | "pending" | "timeout">;
    interval: import("@kbn/config-schema").Type<string>;
}>;
export declare const backfillSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    createdAt: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    rule: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string>;
        tags: import("@kbn/config-schema").Type<string[]>;
        actions: import("@kbn/config-schema").Type<Readonly<{
            uuid?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                throttle: string | null;
                notifyWhen: "onActiveAlert" | "onThrottleInterval" | "onActionGroupChange";
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
                    days: (2 | 1 | 4 | 5 | 3 | 6 | 7)[];
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
        }>[]>;
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
        createdAt: import("@kbn/config-schema").Type<string>;
        updatedAt: import("@kbn/config-schema").Type<string>;
        revision: import("@kbn/config-schema").Type<number>;
    }>;
    spaceId: import("@kbn/config-schema").Type<string>;
    start: import("@kbn/config-schema").Type<string>;
    status: import("@kbn/config-schema").Type<"error" | "complete" | "running" | "pending" | "timeout">;
    end: import("@kbn/config-schema").Type<string | undefined>;
    schedule: import("@kbn/config-schema").Type<Readonly<{} & {
        status: "error" | "complete" | "running" | "pending" | "timeout";
        interval: string;
        runAt: string;
    }>[]>;
    initiator: import("@kbn/config-schema").Type<"system" | "user">;
    initiatorId: import("@kbn/config-schema").Type<string | undefined>;
    warnings: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
