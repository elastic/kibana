import type { Vis } from '@kbn/visualizations-plugin/public';
import type { TileMapVisParams } from './types';
export declare function extractLayerDescriptorParams(vis: Vis<TileMapVisParams>): {
    [key: string]: any;
};
