import type { Map as MbMap } from '@kbn/mapbox-gl';
import { AbstractStyleProperty } from './style_property';
import type { LabelPositionStylePropertyDescriptor } from '../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../common/constants';
import type { DynamicIconProperty } from './dynamic_icon_property';
import type { StaticIconProperty } from './static_icon_property';
import type { DynamicSizeProperty } from './dynamic_size_property';
import type { StaticSizeProperty } from './static_size_property';
export declare class LabelPositionProperty extends AbstractStyleProperty<LabelPositionStylePropertyDescriptor['options']> {
    private readonly _iconProperty;
    private readonly _iconSizeProperty;
    private readonly _labelSizeProperty;
    private readonly _isSymbolizedAsIcon;
    constructor(options: LabelPositionStylePropertyDescriptor['options'], styleName: VECTOR_STYLES, iconProperty: StaticIconProperty | DynamicIconProperty, iconSizeProperty: StaticSizeProperty | DynamicSizeProperty, labelSizeProperty: StaticSizeProperty | DynamicSizeProperty, isSymbolizedAsIcon: boolean);
    isDisabled(): boolean;
    getDisabledReason(): string;
    syncLabelPositionWithMb(mbLayerId: string, mbMap: MbMap): void;
    _getTextOffset(symbolSize: number, labelSize: number): number[];
    _getIconScale(): 1 | 0 | 1.75;
    _getLabelSize(): number;
    _isIconSizeFromJoin(): boolean;
}
