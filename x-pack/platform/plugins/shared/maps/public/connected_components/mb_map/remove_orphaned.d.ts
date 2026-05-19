import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { ILayer } from '../../classes/layers/layer';
export declare function removeOrphanedSourcesAndLayers(mbMap: MbMap, layerList: ILayer[], spatialFilterLayer: ILayer): void;
