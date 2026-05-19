import type { ElasticsearchClient, Logger, SavedObject, SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import { INSTALL_STATES } from '../../../../../common/types';
import type { PackageInstallContext, StateNames, StateContext } from '../../../../../common/types';
import type { PackageAssetReference } from '../../../../types';
import type { Installation, InstallType, InstallSource, PackageVerificationResult, EsAssetReference, KibanaAssetReference, IndexTemplateEntry, AssetReference } from '../../../../types';
import type { StateMachineStates } from './state_machine';
export interface InstallContext extends StateContext<StateNames> {
    savedObjectsClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    logger: Logger;
    installedPkg?: SavedObject<Installation>;
    packageInstallContext: PackageInstallContext;
    installType: InstallType;
    installSource: InstallSource;
    spaceId: string;
    force?: boolean;
    verificationResult?: PackageVerificationResult;
    request?: KibanaRequest;
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
    retryFromLastState?: boolean;
    initialState?: INSTALL_STATES;
    useStreaming?: boolean;
    indexTemplates?: IndexTemplateEntry[];
    packageAssetRefs?: PackageAssetReference[];
    esReferences?: EsAssetReference[];
    kibanaAssetPromise?: Promise<KibanaAssetReference[]>;
    skipDependencyCheck?: boolean;
}
/**
 * This data structure defines the sequence of the states and the transitions
 */
export declare const regularStatesDefinition: StateMachineStates<StateNames>;
export declare const streamingStatesDefinition: StateMachineStates<string>;
export declare function _stateMachineInstallPackage(context: InstallContext): Promise<AssetReference[]>;
