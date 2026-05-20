import type { Query } from '@kbn/es-query';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { MapApi } from '@kbn/maps-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
export declare function redirectToGeoJobWizard(embeddable: MapApi, dataViewId: string, geoField: string, layerQuery: Query | null, splitField: string | null, share: SharePluginStart): Promise<void>;
export declare function isCompatibleMapVisualization(api: MapApi): boolean;
export declare function getJobsItemsFromEmbeddable(embeddable: MapApi): Promise<{
    from: string;
    to: string;
    query: Query;
    filters: import("@kbn/es-query").Filter[];
    dashboard: DashboardApi | undefined;
}>;
