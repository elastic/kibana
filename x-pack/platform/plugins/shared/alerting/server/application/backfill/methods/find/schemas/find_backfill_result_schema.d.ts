export declare const findBackfillResultSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        end?: string | undefined;
        warnings?: string[] | undefined;
        initiatorId?: string | undefined;
    } & {
        status: "error" | "complete" | "timeout" | "pending" | "running";
        id: string;
        rule: Readonly<{
            apiKeyCreatedByUser?: boolean | null | undefined;
        } & {
            id: string;
            name: string;
            tags: string[];
            params: Record<string, any>;
            enabled: boolean;
            updatedAt: string;
            schedule: Readonly<{} & {
                interval: string;
            }>;
            createdAt: string;
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
                        hours: Readonly<{} & {
                            start: string;
                            end: string;
                        }>;
                        days: (2 | 1 | 4 | 5 | 3 | 7 | 6)[];
                        timezone: string;
                    }> | undefined;
                } & {}> | undefined;
                useAlertDataForTemplate?: boolean | undefined;
            } & {
                id: string;
                params: Record<string, any>;
                group: string;
                actionTypeId: string;
            }>[];
            createdBy: string | null;
            updatedBy: string | null;
            consumer: string;
            revision: number;
            alertTypeId: string;
            apiKeyOwner: string | null;
        }>;
        duration: string;
        start: string;
        enabled: boolean;
        schedule: Readonly<{} & {
            status: "error" | "complete" | "timeout" | "pending" | "running";
            interval: string;
            runAt: string;
        }>[];
        createdAt: string;
        spaceId: string;
        initiator: "system" | "user";
    }>[]>;
}>;
