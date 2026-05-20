import type { CoreSetup } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { MlFeatures, NLPSettings, ExperimentalFeatures } from '../../../common/constants/app';
import type { MlStartDependencies } from '../../plugin';
import type { ManagementSectionId } from '.';
export declare function mountApp(core: CoreSetup<MlStartDependencies>, params: ManagementAppMountParams, deps: {
    usageCollection?: UsageCollectionSetup;
}, isServerless: boolean, mlFeatures: MlFeatures, experimentalFeatures: ExperimentalFeatures, nlpSettings: NLPSettings, entryPoint: ManagementSectionId): Promise<() => void>;
