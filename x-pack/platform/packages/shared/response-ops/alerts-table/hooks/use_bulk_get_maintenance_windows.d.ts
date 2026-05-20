import type { QueryOptionsOverrides } from '@kbn/alerts-ui-shared/src/common/types/tanstack_query_utility_types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { bulkGetMaintenanceWindows } from '../apis/bulk_get_maintenance_windows';
interface UseBulkGetMaintenanceWindowsQueryParams {
    ids: string[];
    http: HttpStart;
    notifications: NotificationsStart;
    application: ApplicationStart;
    licensing: LicensingPluginStart;
}
export declare const useBulkGetMaintenanceWindowsQuery: ({ ids, http, notifications: { toasts }, application: { capabilities }, licensing, }: UseBulkGetMaintenanceWindowsQueryParams, { enabled, context, }?: Pick<QueryOptionsOverrides<typeof bulkGetMaintenanceWindows>, "enabled" | "context">) => import("@kbn/react-query").UseQueryResult<Map<string, Readonly<{
    scope?: Readonly<{} & {
        alerting: Readonly<{
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
        }> | null;
    }> | undefined;
    categoryIds?: ("observability" | "management" | "securitySolution")[] | null | undefined;
    scopedQuery?: Readonly<{
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
    }> | null | undefined;
} & {
    status: "archived" | "disabled" | "running" | "finished" | "upcoming";
    id: string;
    title: string;
    duration: number;
    enabled: boolean;
    updatedAt: string;
    schedule: Readonly<{} & {
        custom: Readonly<{
            recurring?: Readonly<{
                every?: string | undefined;
                end?: string | undefined;
                onWeekDay?: string[] | undefined;
                onMonthDay?: number[] | undefined;
                onMonth?: number[] | undefined;
                occurrences?: number | undefined;
            } & {}> | undefined;
            timezone?: string | undefined;
        } & {
            duration: string;
            start: string;
        }>;
    }>;
    createdAt: string;
    createdBy: string | null;
    updatedBy: string | null;
    expirationDate: string;
    events: Readonly<{} & {
        gte: string;
        lte: string;
    }>[];
    rRule: Readonly<{
        count?: number | undefined;
        interval?: number | undefined;
        wkst?: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" | undefined;
        byyearday?: number[] | null | undefined;
        bymonth?: number[] | null | undefined;
        bysetpos?: number[] | null | undefined;
        bymonthday?: number[] | null | undefined;
        byweekday?: (string | number)[] | null | undefined;
        byhour?: number[] | null | undefined;
        byminute?: number[] | null | undefined;
        bysecond?: number[] | null | undefined;
        freq?: 0 | 2 | 1 | 4 | 5 | 3 | 6 | undefined;
        until?: string | undefined;
        byweekno?: number[] | null | undefined;
    } & {
        dtstart: string;
        tzid: string;
    }>;
    eventStartTime: string | null;
    eventEndTime: string | null;
}>>, unknown>;
export {};
