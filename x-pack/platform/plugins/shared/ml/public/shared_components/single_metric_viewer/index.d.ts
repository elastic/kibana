import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { SingleMetricViewerServices, SingleMetricViewerEmbeddableApi } from '../../embeddables/types';
import type { MlDependencies } from '../../application/app';
import type { SingleMetricViewerSharedComponent } from './single_metric_viewer';
export declare const getSingleMetricViewerComponent: (coreStart: CoreStart, pluginStart: MlDependencies, mlServices: SingleMetricViewerServices, api?: SingleMetricViewerEmbeddableApi) => SingleMetricViewerSharedComponent;
export type { SingleMetricViewerSharedComponent } from './single_metric_viewer';
