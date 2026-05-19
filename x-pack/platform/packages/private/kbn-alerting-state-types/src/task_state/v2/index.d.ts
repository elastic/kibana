export { versionSchema, throttledActionSchema, rawAlertInstanceSchema, metaSchema, alertStateSchema, lastScheduledActionsSchema, } from './schema';
export declare const versionDefinition: {
    up: (state: Record<string, unknown>) => Readonly<{
        alertTypeState?: Record<string, any> | undefined;
        alertInstances?: Record<string, Readonly<{
            state?: Record<string, any> | undefined;
            meta?: Readonly<{
                uuid?: string | undefined;
                flappingHistory?: boolean[] | undefined;
                flapping?: boolean | undefined;
                pendingRecoveredCount?: number | undefined;
                activeCount?: number | undefined;
                lastScheduledActions?: Readonly<{
                    actions?: Record<string, Readonly<{} & {
                        date: string;
                    }>> | undefined;
                    subgroup?: string | undefined;
                } & {
                    group: string;
                    date: string;
                }> | undefined;
                maintenanceWindowIds?: string[] | undefined;
                maintenanceWindowNames?: string[] | undefined;
            } & {}> | undefined;
        } & {}>> | undefined;
        alertRecoveredInstances?: Record<string, Readonly<{
            state?: Record<string, any> | undefined;
            meta?: Readonly<{
                uuid?: string | undefined;
                flappingHistory?: boolean[] | undefined;
                flapping?: boolean | undefined;
                pendingRecoveredCount?: number | undefined;
                activeCount?: number | undefined;
                lastScheduledActions?: Readonly<{
                    actions?: Record<string, Readonly<{} & {
                        date: string;
                    }>> | undefined;
                    subgroup?: string | undefined;
                } & {
                    group: string;
                    date: string;
                }> | undefined;
                maintenanceWindowIds?: string[] | undefined;
                maintenanceWindowNames?: string[] | undefined;
            } & {}> | undefined;
        } & {}>> | undefined;
        previousStartedAt?: string | null | undefined;
        summaryActions?: Record<string, Readonly<{} & {
            date: string;
        }>> | undefined;
        trackedExecutions?: string[] | undefined;
    } & {}>;
    schema: import("@kbn/config-schema").ObjectType<Omit<{
        alertTypeState: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
        alertInstances: import("@kbn/config-schema").Type<Record<string, Readonly<{
            state?: Record<string, any> | undefined;
            meta?: Readonly<{
                uuid?: string | undefined;
                flappingHistory?: boolean[] | undefined;
                flapping?: boolean | undefined;
                pendingRecoveredCount?: number | undefined;
                activeCount?: number | undefined;
                lastScheduledActions?: Readonly<{
                    actions?: Record<string, Readonly<{} & {
                        date: string;
                    }>> | undefined;
                    subgroup?: string | undefined;
                } & {
                    group: string;
                    date: string;
                }> | undefined;
                maintenanceWindowIds?: string[] | undefined;
                maintenanceWindowNames?: string[] | undefined;
            } & {}> | undefined;
        } & {}>> | undefined>;
        alertRecoveredInstances: import("@kbn/config-schema").Type<Record<string, Readonly<{
            state?: Record<string, any> | undefined;
            meta?: Readonly<{
                uuid?: string | undefined;
                flappingHistory?: boolean[] | undefined;
                flapping?: boolean | undefined;
                pendingRecoveredCount?: number | undefined;
                activeCount?: number | undefined;
                lastScheduledActions?: Readonly<{
                    actions?: Record<string, Readonly<{} & {
                        date: string;
                    }>> | undefined;
                    subgroup?: string | undefined;
                } & {
                    group: string;
                    date: string;
                }> | undefined;
                maintenanceWindowIds?: string[] | undefined;
                maintenanceWindowNames?: string[] | undefined;
            } & {}> | undefined;
        } & {}>> | undefined>;
        previousStartedAt: import("@kbn/config-schema").Type<string | null | undefined>;
        summaryActions: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
            date: string;
        }>> | undefined>;
    }, "trackedExecutions"> & {
        trackedExecutions: import("@kbn/config-schema").Type<string[] | undefined>;
    }>;
};
