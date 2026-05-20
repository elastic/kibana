import type { StartServicesAccessor } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { SingleMetricViewerEmbeddableServices, SingleMetricViewerServices } from '../types';
/**
 * Provides the ML services required by the Single Metric Viewer Embeddable.
 */
export declare const getMlServices: (coreStart: CoreStart, pluginsStart: MlStartDependencies, usageCollection?: UsageCollectionSetup) => Promise<SingleMetricViewerServices>;
/**
 * Provides the services required by the Single Metric Viewer Embeddable.
 */
export declare const getServices: (getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>, usageCollection?: UsageCollectionSetup) => Promise<SingleMetricViewerEmbeddableServices>;
