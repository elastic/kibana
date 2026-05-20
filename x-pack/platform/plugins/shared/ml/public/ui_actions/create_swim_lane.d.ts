import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables/anomaly_swimlane/types';
import type { MlCoreSetup } from '../plugin';
export declare const EDIT_SWIMLANE_PANEL_ACTION = "editSwimlanePanelAction";
export type CreateSwimlanePanelActionContext = EmbeddableApiContext & {
    embeddable: AnomalySwimLaneEmbeddableApi;
};
export declare function createAddSwimlanePanelAction(getStartServices: MlCoreSetup['getStartServices']): UiActionsActionDefinition<CreateSwimlanePanelActionContext>;
