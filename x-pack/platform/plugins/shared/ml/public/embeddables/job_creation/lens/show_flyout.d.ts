import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { LensApi } from '@kbn/lens-plugin/public';
export declare function showLensVisToADJobFlyout(embeddable: LensApi, coreStart: CoreStart, share: SharePluginStart, data: DataPublicPluginStart, dashboardService: DashboardStart, lens: LensPublicStart): Promise<void>;
