import type { $Values } from '@kbn/utility-types';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { PaletteOutput, ColorMapping } from '@kbn/coloring';
import type { Orientation } from '@kbn/expression-tagcloud-plugin/common';
export interface TagcloudState {
    layerId: string;
    tagAccessor?: string;
    valueAccessor?: string;
    maxFontSize: number;
    minFontSize: number;
    orientation: $Values<typeof Orientation>;
    /**
     * @deprecated use `colorMapping` config
     */
    palette?: PaletteOutput;
    showLabel: boolean;
    colorMapping?: ColorMapping.Config;
}
export interface TagcloudConfig extends TagcloudState {
    title: string;
    description: string;
}
export interface TagcloudProps {
    data: Datatable;
    args: TagcloudConfig;
}
