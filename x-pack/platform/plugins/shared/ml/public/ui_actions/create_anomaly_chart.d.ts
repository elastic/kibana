import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { AnomalyChartsEmbeddableApi } from '../embeddables';
import type { MlCoreSetup } from '../plugin';
export declare const EDIT_ANOMALY_CHARTS_PANEL_ACTION = "editAnomalyChartsPanelAction";
export type CreateAnomalyChartsPanelActionContext = EmbeddableApiContext & {
    embeddable: AnomalyChartsEmbeddableApi;
};
export declare function createAddAnomalyChartsPanelAction(getStartServices: MlCoreSetup['getStartServices']): UiActionsActionDefinition<CreateAnomalyChartsPanelActionContext>;
