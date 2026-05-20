import type { CoreStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { ClientConfigType, ReportingAPIClient } from '@kbn/reporting-public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
export declare function mountManagementSection({ coreStart, license$, dataService, shareService, config, apiClient, params, actionsService, notificationsService, }: {
    coreStart: CoreStart;
    license$: LicensingPluginStart['license$'];
    dataService: DataPublicPluginStart;
    shareService: SharePluginStart;
    config: ClientConfigType;
    apiClient: ReportingAPIClient;
    params: ManagementAppMountParams;
    actionsService: ActionsPublicPluginSetup;
    notificationsService: NotificationsStart;
}): Promise<() => void>;
