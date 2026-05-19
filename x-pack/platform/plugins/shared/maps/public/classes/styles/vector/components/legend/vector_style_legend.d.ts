import React from 'react';
import type { Mask } from '../../../../layers/vector_layer/mask';
import type { IStyleProperty } from '../../properties/style_property';
interface Props {
    isLinesOnly: boolean;
    isPointsOnly: boolean;
    masks: Mask[];
    styles: Array<IStyleProperty<any>>;
    symbolId?: string;
    svg?: string;
}
export declare function VectorStyleLegend({ isLinesOnly, isPointsOnly, masks, styles, symbolId, svg, }: Props): React.JSX.Element;
export {};
