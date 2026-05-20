import type { CasesPublicSetup } from '@kbn/cases-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { MlStartDependencies } from '../plugin';
export declare function registerAnomalyChartsCasesAttachment(cases: CasesPublicSetup, coreStart: CoreStart, pluginStart: MlStartDependencies, usageCollection?: UsageCollectionSetup): void;
