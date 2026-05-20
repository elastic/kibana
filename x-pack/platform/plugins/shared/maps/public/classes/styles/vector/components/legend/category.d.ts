import type { ReactElement } from 'react';
import React from 'react';
import { VECTOR_STYLES } from '../../../../../../common/constants';
interface Props {
    styleName: VECTOR_STYLES;
    label: ReactElement<any> | string | number;
    color: string;
    isLinesOnly: boolean;
    isPointsOnly: boolean;
    symbolId?: string;
    svg?: string;
}
export declare function Category({ styleName, label, color, isLinesOnly, isPointsOnly, symbolId, svg, }: Props): React.JSX.Element;
export {};
