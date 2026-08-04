import type { ReactNode } from 'react';
import React from 'react';
import type { ColorDynamicOptions } from '../../../../../../common/descriptor_types';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { StyleField } from '../../style_fields_helper';
import type { DynamicColorProperty } from '../../properties/dynamic_color_property';
interface Props {
    fields: StyleField[];
    onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: ColorDynamicOptions) => void;
    staticDynamicSelect?: ReactNode;
    styleProperty: DynamicColorProperty;
    swatches: string[];
}
export declare function DynamicColorForm({ fields, onDynamicStyleChange, staticDynamicSelect, styleProperty, swatches, }: Props): React.JSX.Element;
export {};
