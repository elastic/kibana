import type { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type { MapCenterAndZoom, MapExtent, MapSettings } from '../descriptor_types';
import type { MapAttributes } from '../../server';
export type MapEmbeddableBaseState = SerializedTimeRange & SerializedTitles & SerializedDrilldowns & {
    isLayerTOCOpen?: boolean;
    openTOCDetails?: string[];
    mapCenter?: MapCenterAndZoom;
    mapBuffer?: MapExtent;
    mapSettings?: Partial<MapSettings>;
    hiddenLayers?: string[];
    filterByMapExtent?: boolean;
    isMovementSynchronized?: boolean;
};
export type MapByReferenceState = MapEmbeddableBaseState & {
    savedObjectId: string;
};
export type MapByValueState = MapEmbeddableBaseState & {
    attributes: MapAttributes;
};
export type MapEmbeddableState = MapByReferenceState | MapByValueState;
