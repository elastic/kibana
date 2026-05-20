import type { ReactNode } from 'react';
import React from 'react';
import type { StyleField } from '../../style_fields_helper';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { LabelDynamicOptions } from '../../../../../../common/descriptor_types';
import type { DynamicTextProperty } from '../../properties/dynamic_text_property';
interface Props {
    fields: StyleField[];
    onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: LabelDynamicOptions) => void;
    staticDynamicSelect?: ReactNode;
    styleProperty: DynamicTextProperty;
}
export declare function DynamicLabelForm({ fields, onDynamicStyleChange, staticDynamicSelect, styleProperty, }: Props): React.JSX.Element;
export {};
