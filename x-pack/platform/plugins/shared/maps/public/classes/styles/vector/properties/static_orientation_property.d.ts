import type { Map as MbMap } from '@kbn/mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import type { VECTOR_STYLES } from '../../../../../common/constants';
import type { OrientationStaticOptions } from '../../../../../common/descriptor_types';
export declare class StaticOrientationProperty extends StaticStyleProperty<OrientationStaticOptions> {
    constructor(options: OrientationStaticOptions, styleName: VECTOR_STYLES);
    syncIconRotationWithMb(symbolLayerId: string, mbMap: MbMap): void;
}
