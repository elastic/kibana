import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type { AnomalyChartsApi, AnomalyChartsEmbeddableApi } from '../embeddables';
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables/anomaly_swimlane/types';
import type { MlCoreSetup } from '../plugin';
export interface OpenInAnomalyExplorerSwimLaneActionContext extends EmbeddableApiContext {
    embeddable: AnomalySwimLaneEmbeddableApi;
    /**
     * Optional data provided by swim lane selection
     */
    data?: AppStateSelectedCells;
}
export interface OpenInAnomalyExplorerAnomalyChartsActionContext extends EmbeddableApiContext {
    embeddable: AnomalyChartsEmbeddableApi;
    /**
     * Optional fields selected using anomaly charts
     */
    data?: MlEntityField[];
}
export declare const OPEN_IN_ANOMALY_EXPLORER_ACTION = "openInAnomalyExplorerAction";
export declare function isAnomalyChartsEmbeddableContext(arg: unknown): arg is {
    embeddable: AnomalyChartsApi;
};
export declare function createOpenInExplorerAction(getStartServices: MlCoreSetup['getStartServices']): UiActionsActionDefinition<OpenInAnomalyExplorerSwimLaneActionContext | OpenInAnomalyExplorerAnomalyChartsActionContext>;
