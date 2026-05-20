import type { $Values } from '@kbn/utility-types';
import { Orientation } from '@kbn/expression-tagcloud-plugin/common';
export declare const TAGCLOUD_LABEL: string;
export declare const DEFAULT_STATE: {
    maxFontSize: number;
    minFontSize: number;
    orientation: $Values<typeof Orientation>;
    showLabel: boolean;
};
