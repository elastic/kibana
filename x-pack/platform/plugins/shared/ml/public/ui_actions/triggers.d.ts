import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables/anomaly_swimlane/types';
export interface AnomalySwimLaneSelectionTriggerContext extends EmbeddableApiContext {
    embeddable: AnomalySwimLaneEmbeddableApi;
    /**
     * Data provided by swim lane selection
     */
    data: AppStateSelectedCells;
}
export declare const isAnomalySwimlaneSelectionTriggerContext: (context: unknown) => context is AnomalySwimLaneSelectionTriggerContext;
