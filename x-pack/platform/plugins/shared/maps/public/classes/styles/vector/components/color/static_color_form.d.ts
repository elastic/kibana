import type { ReactNode } from 'react';
import React from 'react';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { ColorStaticOptions } from '../../../../../../common/descriptor_types';
import type { StaticColorProperty } from '../../properties/static_color_property';
interface Props {
    onStaticStyleChange: (propertyName: VECTOR_STYLES, options: ColorStaticOptions) => void;
    staticDynamicSelect?: ReactNode;
    styleProperty: StaticColorProperty;
    swatches: string[];
}
export declare function StaticColorForm({ onStaticStyleChange, staticDynamicSelect, styleProperty, swatches, }: Props): React.JSX.Element;
export {};
