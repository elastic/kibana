import type { Map as MbMap } from '@kbn/mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import type { LabelStaticOptions } from '../../../../../common/descriptor_types';
export declare class StaticTextProperty extends StaticStyleProperty<LabelStaticOptions> {
    isComplete(): boolean;
    syncTextFieldWithMb(mbLayerId: string, mbMap: MbMap): void;
}
