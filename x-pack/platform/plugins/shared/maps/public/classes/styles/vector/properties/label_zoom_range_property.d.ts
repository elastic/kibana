import type { Map as MbMap } from '@kbn/mapbox-gl';
import { AbstractStyleProperty } from './style_property';
import type { LabelZoomRangeStylePropertyDescriptor } from '../../../../../common/descriptor_types';
import type { VECTOR_STYLES } from '../../../../../common/constants';
export declare class LabelZoomRangeProperty extends AbstractStyleProperty<LabelZoomRangeStylePropertyDescriptor['options']> {
    private readonly _layerMinZoom;
    private readonly _layerMaxZoom;
    constructor(options: LabelZoomRangeStylePropertyDescriptor['options'], styleName: VECTOR_STYLES, layerMinZoom: number, layerMaxZoom: number);
    syncLabelZoomRange(mbLayerId: string, mbMap: MbMap): void;
    getLayerZoomRange(): {
        maxZoom: number;
        minZoom: number;
    };
    getLabelZoomRange(): {
        maxZoom: number;
        minZoom: number;
    };
}
