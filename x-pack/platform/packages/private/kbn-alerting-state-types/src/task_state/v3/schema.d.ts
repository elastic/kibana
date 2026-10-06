export * from '../v1';
export declare const versionSchema: import("@kbn/config-schema").ObjectType<{
    alertTypeState: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    alertInstances: import("@kbn/config-schema").Type<Record<string, Readonly<{
        meta?: Readonly<{
            lastScheduledActions?: Readonly<{
                subgroup?: string | undefined;
                actions?: Record<string, Readonly<{} & {
                    date: string;
                }>> | undefined;
            } & {
                group: string;
                date: string;
            }> | undefined;
            flappingHistory?: boolean[] | undefined;
            flapping?: boolean | undefined;
            maintenanceWindowIds?: string[] | undefined;
            maintenanceWindowNames?: string[] | undefined;
            pendingRecoveredCount?: number | undefined;
            uuid?: string | undefined;
            activeCount?: number | undefined;
        } & {}> | undefined;
        state?: Record<string, any> | undefined;
    } & {}>> | undefined>;
    alertRecoveredInstances: import("@kbn/config-schema").Type<Record<string, Readonly<{
        meta?: Readonly<{
            lastScheduledActions?: Readonly<{
                subgroup?: string | undefined;
                actions?: Record<string, Readonly<{} & {
                    date: string;
                }>> | undefined;
            } & {
                group: string;
                date: string;
            }> | undefined;
            flappingHistory?: boolean[] | undefined;
            flapping?: boolean | undefined;
            maintenanceWindowIds?: string[] | undefined;
            maintenanceWindowNames?: string[] | undefined;
            pendingRecoveredCount?: number | undefined;
            uuid?: string | undefined;
            activeCount?: number | undefined;
        } & {}> | undefined;
        state?: Record<string, any> | undefined;
    } & {}>> | undefined>;
    previousStartedAt: import("@kbn/config-schema").Type<string | null | undefined>;
    summaryActions: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
        date: string;
    }>> | undefined>;
}>;
