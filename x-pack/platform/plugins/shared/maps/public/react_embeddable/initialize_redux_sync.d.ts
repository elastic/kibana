import { BehaviorSubject } from 'rxjs';
import type { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { MapCenterAndZoom } from '../../common/descriptor_types';
import type { MapEmbeddableState } from '../../common';
import type { EventHandlers } from '../reducers/non_serializable_instances';
import type { SavedMap } from '../routes';
export declare const reduxSyncComparators: StateComparators<Pick<MapEmbeddableState, 'hiddenLayers' | 'isLayerTOCOpen' | 'mapCenter' | 'mapBuffer' | 'openTOCDetails'>>;
export declare function initializeReduxSync({ savedMap, state, syncColors$, uuid, }: {
    savedMap: SavedMap;
    state: MapEmbeddableState;
    syncColors$?: PublishingSubject<boolean | undefined>;
    uuid: string;
}): {
    cleanup: () => void;
    api: {
        dataLoading$: BehaviorSubject<boolean | undefined>;
        filters$: BehaviorSubject<Filter[] | undefined>;
        getInspectorAdapters: () => import("@kbn/inspector-plugin/common").Adapters;
        getLayerList: () => import("../classes/layers/layer").ILayer[];
        onRenderComplete$: import("rxjs").Observable<void>;
        query$: BehaviorSubject<Query | AggregateQuery | undefined>;
        reload: () => void;
        setEventHandlers: (eventHandlers: EventHandlers) => void;
    };
    anyStateChange$: import("rxjs").Observable<undefined>;
    getLatestState: () => {
        hiddenLayers: string[];
        isLayerTOCOpen: boolean;
        mapBuffer: import("../../common/descriptor_types").MapExtent | undefined;
        mapCenter: MapCenterAndZoom;
        openTOCDetails: string[];
    };
};
