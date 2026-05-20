import type { MapExtent } from '../../common/descriptor_types';
import type { ILayer } from '../classes/layers/layer';
import type { DataRequestContext } from './data_request_actions';
export declare function getLayersExtent(layers: ILayer[], getDataRequestContext: (layerId: string) => DataRequestContext): Promise<MapExtent | null>;
