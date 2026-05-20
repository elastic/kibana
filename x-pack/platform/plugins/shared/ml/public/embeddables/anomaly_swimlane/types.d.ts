import type { HasEditCapabilities, PublishesDataViews, PublishesUnifiedSearch, PublishesWritableTitle, PublishingSubject } from '@kbn/presentation-publishing';
import type { AnomalySwimLaneEmbeddableState, AnomalySwimlaneEmbeddableUserInput } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type { SwimlaneType } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { AppStateSelectedCells } from '../../application/explorer/explorer_utils';
import type { MlEmbeddableBaseApi } from '../types';
export interface AnomalySwimLaneComponentApi {
    jobIds: PublishingSubject<JobId[]>;
    swimlaneType: PublishingSubject<SwimlaneType>;
    viewBy: PublishingSubject<string | undefined>;
    perPage: PublishingSubject<number | undefined>;
    fromPage: PublishingSubject<number>;
    interval: PublishingSubject<number | undefined>;
    setInterval: (interval: number | undefined) => void;
    updateUserInput: (input: AnomalySwimlaneEmbeddableUserInput) => void;
    updatePagination: (update: {
        perPage?: number;
        fromPage: number;
    }) => void;
}
export type AnomalySwimLaneEmbeddableApi = MlEmbeddableBaseApi<AnomalySwimLaneEmbeddableState> & PublishesDataViews & PublishesUnifiedSearch & PublishesWritableTitle & HasEditCapabilities & AnomalySwimLaneComponentApi;
export interface AnomalySwimLaneActionContext {
    embeddable: AnomalySwimLaneEmbeddableApi;
    data?: AppStateSelectedCells;
}
export declare function isSwimLaneEmbeddableContext(arg: unknown): arg is AnomalySwimLaneActionContext;
/**
 * The subset of the Anomaly Swim Lane Embeddable state that is actually used by the swimlane embeddable.
 *
 * TODO: Ideally this should be the same as the AnomalySwimLaneEmbeddableState, but that type is used in many
 * places, so we cannot change it at the moment.
 */
export type AnomalySwimlaneRuntimeState = Omit<AnomalySwimLaneEmbeddableState, 'id' | 'filters' | 'query' | 'refreshConfig'>;
