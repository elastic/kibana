import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables/anomaly_swimlane/types';
import type { MlCoreSetup } from '../plugin';
export declare const APPLY_TIME_RANGE_SELECTION_ACTION = "applyTimeRangeSelectionAction";
export interface ApplyTimeRangeSelectionActionContext extends EmbeddableApiContext {
    embeddable: AnomalySwimLaneEmbeddableApi;
    /**
     * Optional data provided by swim lane selection
     */
    data?: AppStateSelectedCells;
}
export declare function createApplyTimeRangeSelectionAction(getStartServices: MlCoreSetup['getStartServices']): UiActionsActionDefinition<ApplyTimeRangeSelectionActionContext>;
