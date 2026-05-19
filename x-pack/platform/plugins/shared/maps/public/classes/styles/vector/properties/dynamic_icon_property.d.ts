import React from 'react';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DynamicStyleProperty } from './dynamic_style_property';
import type { LegendProps } from './style_property';
import type { IconDynamicOptions } from '../../../../../common/descriptor_types';
export declare class DynamicIconProperty extends DynamicStyleProperty<IconDynamicOptions> {
    isOrdinal(): boolean;
    isCategorical(): boolean;
    getNumberOfCategories(): number;
    syncIconWithMb(symbolLayerId: string, mbMap: MbMap): void;
    _getPaletteStops(): {
        fallbackSymbolId: string | null;
        stops: {
            stop: string | null;
            style: string;
            iconSource: import("../../../../../common/constants").ICON_SOURCE | undefined;
        }[];
    };
    _getMbIconImageExpression(): (string | (string | string[])[])[] | null;
    _getMbIconAnchorExpression(): (string | (string | string[])[])[] | null;
    _isIconDynamicConfigComplete(): boolean | null;
    renderLegendDetailRow({ isPointsOnly, isLinesOnly }: LegendProps): React.JSX.Element;
}
