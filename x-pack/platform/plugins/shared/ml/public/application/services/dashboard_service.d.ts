import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { SharePluginStart } from '@kbn/share-plugin/public';
export type DashboardService = ReturnType<typeof dashboardServiceProvider>;
export type DashboardItems = Awaited<ReturnType<DashboardService['fetchDashboards']>>;
export declare function dashboardServiceProvider(dashboardService: DashboardStart, share: SharePluginStart): {
    /**
     * Fetches dashboards
     */
    fetchDashboards(query?: string): Promise<Readonly<{} & {
        data: Readonly<{
            description?: string | undefined;
            tags?: string[] | undefined;
            time_range?: Readonly<{
                mode?: "absolute" | "relative" | undefined;
            } & {
                from: string;
                to: string;
            }> | undefined;
            access_control?: Readonly<{
                access_mode?: "default" | "write_restricted" | undefined;
            } & {}> | undefined;
        } & {
            title: string;
        }>;
        id: string;
        meta: Readonly<{
            managed?: boolean | undefined;
            version?: string | undefined;
            updated_at?: string | undefined;
            updated_by?: string | undefined;
            created_at?: string | undefined;
            created_by?: string | undefined;
            owner?: string | undefined;
        } & {}>;
    }>[]>;
    /**
     * Fetch dashboards by id
     */
    fetchDashboardsById(ids: string[]): Promise<import("@kbn/dashboard-plugin/public").FindDashboardsByIdResponse[]>;
    /**
     * Generates dashboard url
     */
    getDashboardUrl(dashboardId: string, viewMode?: ViewMode): Promise<string | undefined>;
};
/**
 * Hook to use {@link DashboardService} in react components
 */
export declare function useDashboardService(): DashboardService;
