import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { CustomRequestHandlerContext } from '@kbn/core/server';
import type { FleetSetupContract, FleetStartContract } from '@kbn/fleet-plugin/server';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/server';
export interface DatasetQualityPluginSetupDependencies {
    alerting?: AlertingServerSetup;
    fleet: FleetSetupContract;
    share?: SharePluginSetup;
}
export interface DatasetQualityPluginStartDependencies {
    alerting?: AlertingServerStart;
    fleet: FleetStartContract;
    share?: SharePluginStart;
}
export interface DatasetQualityPluginSetup {
}
export interface DatasetQualityPluginStart {
}
export type DatasetQualityRequestHandlerContext = CustomRequestHandlerContext<{}>;
