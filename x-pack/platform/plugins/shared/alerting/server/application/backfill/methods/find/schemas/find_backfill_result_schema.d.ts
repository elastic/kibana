export declare const findBackfillResultSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
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
    }>[]>;
}>;
