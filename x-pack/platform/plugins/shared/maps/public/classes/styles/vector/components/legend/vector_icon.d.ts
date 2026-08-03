import type { CSSProperties } from 'react';
import React from 'react';
interface Props {
    borderStyle?: CSSProperties;
    fillColor?: string;
    isPointsOnly: boolean;
    isLinesOnly: boolean;
    strokeColor?: string;
    symbolId?: string;
    svg?: string;
}
export declare function VectorIcon({ borderStyle, fillColor, isPointsOnly, isLinesOnly, strokeColor, symbolId, svg, }: Props): React.JSX.Element | null;
export {};
