import type { Map as MbMap } from '@kbn/mapbox-gl';
import { AbstractStyleProperty } from './style_property';
import type { LabelBorderSizeOptions } from '../../../../../common/descriptor_types';
import type { VECTOR_STYLES } from '../../../../../common/constants';
import type { StaticSizeProperty } from './static_size_property';
import type { DynamicSizeProperty } from './dynamic_size_property';
export declare class LabelBorderSizeProperty extends AbstractStyleProperty<LabelBorderSizeOptions> {
    private readonly _labelSizeProperty;
    constructor(options: LabelBorderSizeOptions, styleName: VECTOR_STYLES, labelSizeProperty: StaticSizeProperty | DynamicSizeProperty);
    syncLabelBorderSizeWithMb(mbLayerId: string, mbMap: MbMap): void;
}
