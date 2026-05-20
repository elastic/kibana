import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { SingleMetricViewerEmbeddableApi } from '../embeddables/types';
import type { MlCoreSetup } from '../plugin';
export type CreateSingleMetricViewerPanelActionContext = EmbeddableApiContext & {
    embeddable: SingleMetricViewerEmbeddableApi;
};
export declare function createAddSingleMetricViewerPanelAction(getStartServices: MlCoreSetup['getStartServices']): UiActionsActionDefinition<CreateSingleMetricViewerPanelActionContext>;
