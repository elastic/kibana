import type { StateComparators } from '@kbn/presentation-publishing';
import { type PublishesBlockingError, type PublishesDataLoading, type PublishesDataViews, type PublishesSavedObjectId, type PublishesRendered } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import type { IntegrationCallbacks, LensInternalApi, LensRuntimeState, LensSerializedState } from '@kbn/lens-common';
export interface StateManagementConfig {
    api: Pick<IntegrationCallbacks, 'updateAttributes' | 'updateRefId'> & PublishesSavedObjectId & PublishesDataViews & PublishesDataLoading & PublishesRendered & PublishesBlockingError;
    anyStateChange$: Observable<void>;
    getComparators: () => StateComparators<Pick<LensSerializedState, 'attributes' | 'ref_id'>>;
    reinitializeRuntimeState: (lastSavedRuntimeState: LensRuntimeState) => void;
    getLatestState: () => Pick<LensRuntimeState, 'attributes' | 'ref_id'>;
    cleanup: () => void;
}
/**
 * Due to inline editing we need something advanced to handle the state
 * management at the embeddable level, so here's the initializers for it
 */
export declare function initializeStateManagement(initialState: LensRuntimeState, internalApi: LensInternalApi): StateManagementConfig;
