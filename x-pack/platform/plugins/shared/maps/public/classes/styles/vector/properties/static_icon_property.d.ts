import type { Map as MbMap } from '@kbn/mapbox-gl';
import { StaticStyleProperty } from './static_style_property';
import type { IconStaticOptions } from '../../../../../common/descriptor_types';
export declare class StaticIconProperty extends StaticStyleProperty<IconStaticOptions> {
    syncIconWithMb(symbolLayerId: string, mbMap: MbMap): void;
    getSymbolAnchor(): "bottom" | "center";
}
