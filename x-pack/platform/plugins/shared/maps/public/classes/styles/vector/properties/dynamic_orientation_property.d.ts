import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
import type { OrientationDynamicOptions } from '../../../../../common/descriptor_types';
export declare class DynamicOrientationProperty extends DynamicStyleProperty<OrientationDynamicOptions> {
    syncIconRotationWithMb(symbolLayerId: string, mbMap: MbMap): void;
    supportsFieldMeta(): boolean;
    supportsFeatureState(): boolean;
}
