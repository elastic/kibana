import type { MapExtent } from '../../common/descriptor_types';
import type { MapStore } from '../reducers/store';
import type { MapApi } from './types';
export declare function initializeFetch({ api, controlledBy, getIsFilterByMapExtent, searchSessionMapBuffer, store, }: {
    api: MapApi;
    controlledBy: string;
    getIsFilterByMapExtent: () => boolean;
    searchSessionMapBuffer?: MapExtent;
    store: MapStore;
}): () => void;
