import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import { type UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { SingleMetricViewerEmbeddableApi } from '../embeddables';
import type { MlCoreSetup } from '../plugin';
export interface OpenInSingleMetricViewerActionContext extends EmbeddableApiContext {
    embeddable: SingleMetricViewerEmbeddableApi;
}
export declare const OPEN_IN_SINGLE_METRIC_VIEWER_ACTION = "openInSingleMetricViewerAction";
export declare function isSingleMetricViewerEmbeddableContext(arg: unknown): arg is OpenInSingleMetricViewerActionContext;
export declare function createOpenInSingleMetricViewerAction(getStartServices: MlCoreSetup['getStartServices']): UiActionsActionDefinition<OpenInSingleMetricViewerActionContext>;
