import type { Map as MbMap } from '@kbn/mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import type { VECTOR_STYLES } from '../../../../../common/constants';
import type { SizeStaticOptions } from '../../../../../common/descriptor_types';
export declare class StaticSizeProperty extends StaticStyleProperty<SizeStaticOptions> {
    constructor(options: SizeStaticOptions, styleName: VECTOR_STYLES);
    syncHaloWidthWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncIconSizeWithMb(symbolLayerId: string, mbMap: MbMap): void;
    syncCircleStrokeWidthWithMb(mbLayerId: string, mbMap: MbMap, hasNoRadius: boolean): void;
    syncCircleRadiusWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncLineWidthWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncLabelSizeWithMb(mbLayerId: string, mbMap: MbMap): void;
}
