import type { Map as MbMap, LayerSpecification } from '@kbn/mapbox-gl';
import type { ILayer } from '../../classes/layers/layer';
export declare function getIsTextLayer(mbLayer: LayerSpecification): boolean;
export declare function isGlDrawLayer(mbLayerId: string): boolean;
export declare function syncLayerOrder(mbMap: MbMap, spatialFiltersLayer: ILayer, layerList: ILayer[]): void;
