import type { ReactNode } from 'react';
import React from 'react';
import type { SizeDynamicOptions } from '../../../../../../common/descriptor_types';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { DynamicSizeProperty } from '../../properties/dynamic_size_property';
import type { StyleField } from '../../style_fields_helper';
interface Props {
    fields: StyleField[];
    onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: SizeDynamicOptions) => void;
    staticDynamicSelect?: ReactNode;
    styleProperty: DynamicSizeProperty;
}
export declare function DynamicSizeForm({ fields, onDynamicStyleChange, staticDynamicSelect, styleProperty, }: Props): React.JSX.Element;
export {};
