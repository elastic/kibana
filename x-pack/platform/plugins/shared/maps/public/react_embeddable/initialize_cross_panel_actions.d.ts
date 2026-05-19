import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { StateComparators } from '@kbn/presentation-publishing';
import type { SavedMap } from '../routes/map_page';
import type { MapApi } from './types';
import type { MapEmbeddableState } from '../../common';
export declare const crossPanelActionsComparators: StateComparators<Pick<MapEmbeddableState, 'isMovementSynchronized' | 'filterByMapExtent'>>;
export declare function initializeCrossPanelActions({ controlledBy, getActionContext, getApi, savedMap, state, uuid, }: {
    controlledBy: string;
    getActionContext: () => ActionExecutionContext;
    getApi: () => MapApi | undefined;
    savedMap: SavedMap;
    state: MapEmbeddableState;
    uuid: string;
}): {
    cleanup: () => void;
    getIsFilterByMapExtent: () => boolean;
    anyStateChange$: import("rxjs").Observable<undefined>;
    reinitializeState: (lastSaved: MapEmbeddableState) => void;
    getLatestState: () => {
        isMovementSynchronized: boolean | undefined;
        filterByMapExtent: boolean | undefined;
    };
};
