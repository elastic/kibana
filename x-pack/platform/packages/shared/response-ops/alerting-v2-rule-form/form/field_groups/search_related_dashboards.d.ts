import type { DashboardStart } from '@kbn/dashboard-plugin/public';
export interface Dashboard {
    id: string;
    title: string;
}
/** A dashboard artifact whose saved object could not be resolved. */
export interface MissingDashboard {
    id: string;
    /** `true` when the saved object no longer exists (deleted); `false` for other access/load errors. */
    notFound: boolean;
}
export interface ResolveDashboardsResult {
    resolved: Dashboard[];
    missing: MissingDashboard[];
}
export declare const searchRelatedDashboard: (dashboard: DashboardStart, options?: {
    search?: string;
    perPage?: number;
}) => Promise<Dashboard[]>;
/**
 * Resolves attached dashboard ids to their titles, partitioning the results into
 * `resolved` (saved object found) and `missing` (deleted or otherwise unavailable).
 *
 * Uses `findDashboardsService().findByIds`, which reports per-id status — preserving
 * the not-found signal that the deleted-state treatment relies on.
 */
export declare const resolveDashboardsByIds: (dashboard: DashboardStart, ids: string[]) => Promise<ResolveDashboardsResult>;
