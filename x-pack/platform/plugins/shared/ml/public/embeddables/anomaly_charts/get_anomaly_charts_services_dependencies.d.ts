import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { MlStartDependencies } from '../../plugin';
import type { AnomalyChartsEmbeddableServices } from '..';
export declare const getAnomalyChartsServiceDependencies: (coreStart: CoreStart, pluginsStart: MlStartDependencies, usageCollection?: UsageCollectionSetup) => Promise<AnomalyChartsEmbeddableServices>;
