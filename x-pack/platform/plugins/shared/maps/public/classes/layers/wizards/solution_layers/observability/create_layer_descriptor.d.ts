import type { LayerDescriptor } from '../../../../../../common/descriptor_types';
import type { OBSERVABILITY_LAYER_TYPE } from './layer_select';
import type { OBSERVABILITY_METRIC_TYPE } from './metric_select';
import type { DISPLAY } from './display_select';
export declare function createLayerDescriptor({ layer, metric, display, }: {
    layer: OBSERVABILITY_LAYER_TYPE | null;
    metric: OBSERVABILITY_METRIC_TYPE | null;
    display: DISPLAY | null;
}): LayerDescriptor | null;
