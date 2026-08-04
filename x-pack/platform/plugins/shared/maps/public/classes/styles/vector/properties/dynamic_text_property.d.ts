import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
import type { LabelDynamicOptions } from '../../../../../common/descriptor_types';
import type { RawValue } from '../../../../../common/constants';
export declare class DynamicTextProperty extends DynamicStyleProperty<LabelDynamicOptions> {
    syncTextFieldWithMb(mbLayerId: string, mbMap: MbMap): void;
    isOrdinal(): boolean;
    supportsFieldMeta(): boolean;
    supportsFeatureState(): boolean;
    getMbPropertyValue(rawValue: RawValue): RawValue;
}
