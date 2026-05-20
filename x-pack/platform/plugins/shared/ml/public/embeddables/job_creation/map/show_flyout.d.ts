import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { MapApi } from '@kbn/maps-plugin/public';
export declare function showMapVisToADJobFlyout(embeddable: MapApi, coreStart: CoreStart, share: SharePluginStart, data: DataPublicPluginStart, dashboardService: DashboardStart): Promise<void>;
