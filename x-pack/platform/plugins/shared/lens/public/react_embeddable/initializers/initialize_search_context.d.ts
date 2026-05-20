import type { PublishesProjectRoutingOverrides, PublishesUnifiedSearch, StateComparators } from '@kbn/presentation-publishing';
import type { PublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import type { Observable } from 'rxjs';
import type { LensInternalApi, LensRuntimeState, LensUnifiedSearchContext } from '@kbn/lens-common';
import type { LensWireAPIConfig } from '@kbn/lens-common-2';
import type { LensEmbeddableStartServices } from '../types';
export declare const searchContextComparators: StateComparators<LensUnifiedSearchContext>;
export interface SearchContextConfig {
    api: PublishesUnifiedSearch & PublishesSearchSession & PublishesProjectRoutingOverrides;
    anyStateChange$: Observable<void>;
    cleanup: () => void;
    getLatestState: () => LensUnifiedSearchContext;
    reinitializeState: (lastSaved?: LensWireAPIConfig) => void;
}
export declare function initializeSearchContext(initialState: LensRuntimeState, internalApi: LensInternalApi, parentApi: unknown, { injectFilterReferences }: LensEmbeddableStartServices): SearchContextConfig;
