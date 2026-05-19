import { type TypeOf } from '@kbn/config-schema';
import * as v3 from './v3';
export declare const stateSchemaByVersion: {
    1: {
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
        } & {}>;
        schema: import("@kbn/config-schema").ObjectType<{
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
        }>;
    };
    2: {
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
    3: {
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
        } & {}>;
        schema: import("@kbn/config-schema").ObjectType<{
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
        }>;
    };
};
declare const latest: typeof v3;
/**
 * WARNING: Do not modify the code below when doing a new version.
 * Update the "latest" variable instead.
 */
declare const latestTaskStateSchema: import("@kbn/config-schema").ObjectType<{
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
}>;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;
export type LatestRawAlertInstanceSchema = TypeOf<typeof latest.rawAlertInstanceSchema>;
export type LatestAlertInstanceMetaSchema = TypeOf<typeof latest.metaSchema>;
export type LatestAlertInstanceStateSchema = TypeOf<typeof latest.alertStateSchema>;
export type LatestThrottledActionSchema = TypeOf<typeof latest.throttledActionSchema>;
export type LatestLastScheduledActionsSchema = TypeOf<typeof latest.lastScheduledActionsSchema>;
export declare const emptyState: LatestTaskStateSchema;
type Mutable<T> = {
    -readonly [k in keyof T]: Mutable<T[k]>;
};
export type MutableLatestTaskStateSchema = Mutable<LatestTaskStateSchema>;
export type MutableLatestAlertInstanceMetaSchema = Mutable<LatestAlertInstanceMetaSchema>;
export {};
