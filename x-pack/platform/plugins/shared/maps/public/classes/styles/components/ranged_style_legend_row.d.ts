import type { ReactElement } from 'react';
import React from 'react';
interface Props {
    header: ReactElement<any>;
    minLabel: string | number;
    maxLabel: string | number;
    propertyLabel: string;
    fieldLabel: string;
    invert: boolean;
}
export declare function RangedStyleLegendRow({ header, minLabel, maxLabel, propertyLabel, fieldLabel, invert, }: Props): React.JSX.Element;
export {};
