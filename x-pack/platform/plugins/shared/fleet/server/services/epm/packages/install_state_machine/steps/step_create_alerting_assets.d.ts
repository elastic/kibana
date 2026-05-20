import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { type KibanaAssetReference } from '../../../../../../common/types';
import type { InstallablePackage } from '../../../../../../common/types';
import type { InstallContext } from '../_state_machine_package_install';
import type { ArchiveAsset } from '../../../kibana/assets/install';
export declare function createAlertingRuleFromTemplate(deps: {
    rulesClient?: RulesClientApi;
    logger: InstallContext['logger'];
}, params: {
    alertTemplateArchiveAsset: ArchiveAsset;
    spaceId?: string;
    pkgName: string;
}): Promise<KibanaAssetReference>;
export declare function createInactivityMonitoringTemplate(deps: {
    logger: Logger;
    savedObjectsClient: SavedObjectsClientContract;
}, params: {
    packageInfo: InstallablePackage;
    spaceId?: string;
    installAsAdditionalSpace?: boolean;
}): Promise<KibanaAssetReference | undefined>;
export declare function stepCreateAlertingAssets(context: Pick<InstallContext, 'logger' | 'savedObjectsClient' | 'packageInstallContext' | 'spaceId' | 'request'> & {
    installAsAdditionalSpace?: boolean;
}): Promise<void>;
