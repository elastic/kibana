import type { Map as MbMap } from '@kbn/mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import type { ColorStaticOptions } from '../../../../../common/descriptor_types';
export declare class StaticColorProperty extends StaticStyleProperty<ColorStaticOptions> {
    syncCircleColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: unknown): void;
    syncFillColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: unknown): void;
    syncIconColorWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncHaloBorderColorWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncLineColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: unknown): void;
    syncCircleStrokeWithMb(mbLayerId: string, mbMap: MbMap, alpha: unknown): void;
    syncLabelColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: unknown): void;
    syncLabelBorderColorWithMb(mbLayerId: string, mbMap: MbMap): void;
}
