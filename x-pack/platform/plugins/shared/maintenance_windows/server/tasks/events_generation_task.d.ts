import type { SavedObject, ISavedObjectsRepository, ISavedObjectsPointInTimeFinder, StartServicesAccessor } from '@kbn/core/server';
import { type Logger } from '@kbn/core/server';
import type { IntervalSchedule, TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { KueryNode } from '@kbn/es-query';
import type { MaintenanceWindowAttributes } from '../data/types/maintenance_window_attributes';
import type { MaintenanceWindowsServerStartDependencies } from '../types';
export declare const MAINTENANCE_WINDOW_EVENTS_TASK_TYPE = "maintenance-window:generate-events";
export declare const MAINTENANCE_WINDOW_EVENTS_TASK_ID = "maintenance-window:generate-events-generator";
export declare const SCHEDULE: IntervalSchedule;
export declare function initializeMaintenanceWindowEventsGenerator(logger: Logger, taskManager: TaskManagerSetupContract, coreStartServices: StartServicesAccessor<MaintenanceWindowsServerStartDependencies, unknown>): void;
export declare function scheduleMaintenanceWindowEventsGenerator(logger: Logger, taskManager: TaskManagerStartContract): Promise<void>;
export declare function createEventsGeneratorTaskRunner(logger: Logger, coreStartServices: StartServicesAccessor<MaintenanceWindowsServerStartDependencies, unknown>): () => {
    run(): Promise<void>;
    cancel(): Promise<void>;
};
export declare function getStatusFilter(): KueryNode;
export declare const updateMaintenanceWindowsEvents: ({ soFinder, savedObjectsClient, logger, startRangeDate, }: {
    logger: Logger;
    savedObjectsClient: ISavedObjectsRepository;
    soFinder: ISavedObjectsPointInTimeFinder<MaintenanceWindowAttributes, unknown> | null;
    startRangeDate: string;
}) => Promise<number>;
export declare function getSOFinder({ savedObjectsClient, logger, filter, }: {
    logger: Logger;
    savedObjectsClient: ISavedObjectsRepository;
    filter: KueryNode;
}): ISavedObjectsPointInTimeFinder<MaintenanceWindowAttributes, unknown> | null;
export declare function generateEvents({ maintenanceWindowsSO, startRangeDate, }: {
    maintenanceWindowsSO: Array<SavedObject<MaintenanceWindowAttributes>>;
    startRangeDate: string;
}): Promise<{
    id: string;
    title: string;
    enabled: boolean;
    duration: number;
    rRule: Readonly<{
        freq?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined;
        until?: string | undefined;
        count?: number | undefined;
        interval?: number | undefined;
        wkst?: "FR" | "MO" | "SA" | "SU" | "TH" | "TU" | "WE" | undefined;
        byweekday?: (string | number)[] | null | undefined;
        bymonth?: number[] | null | undefined;
        bysetpos?: number[] | null | undefined;
        bymonthday?: number[] | null | undefined;
        byyearday?: number[] | null | undefined;
        byweekno?: number[] | null | undefined;
        byhour?: number[] | null | undefined;
        byminute?: number[] | null | undefined;
        bysecond?: number[] | null | undefined;
    } & {
        dtstart: string;
        tzid: string;
    }>;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
    eventStartTime: string | null;
    eventEndTime: string | null;
    status: "archived" | "disabled" | "finished" | "running" | "upcoming";
    categoryIds?: ("management" | "observability" | "securitySolution")[] | null | undefined;
    scopedQuery?: Readonly<{
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
    }> | null | undefined;
    schedule: Readonly<{} & {
        custom: Readonly<{
            timezone?: string | undefined;
            recurring?: Readonly<{
                end?: string | undefined;
                every?: string | undefined;
                onWeekDay?: string[] | undefined;
                onMonthDay?: number[] | undefined;
                onMonth?: number[] | undefined;
                occurrences?: number | undefined;
            } & {}> | undefined;
        } & {
            start: string;
            duration: string;
        }>;
    }>;
    scope?: Readonly<{
        alerting?: Readonly<{
            kql?: string | undefined;
            filters?: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{} & {
                    store: import("@kbn/es-query-constants").FilterStateStore;
                }> | undefined;
            } & {
                meta: Record<string, any>;
            }>[] | undefined;
            dsl?: string | undefined;
        } & {
            enabled: boolean;
        }> | undefined;
        alertingV2?: Readonly<{
            kql?: string | undefined;
        } & {
            enabled: boolean;
        }> | undefined;
    } & {}> | undefined;
    expirationDate: string;
    events: {
        gte: string;
        lte: string;
    }[];
}[]>;
