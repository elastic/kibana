import type { Vis } from '@kbn/visualizations-plugin/public';
import type { RegionMapVisParams } from './types';
export declare function extractLayerDescriptorParams(vis: Vis<RegionMapVisParams>): {
    [key: string]: any;
};
