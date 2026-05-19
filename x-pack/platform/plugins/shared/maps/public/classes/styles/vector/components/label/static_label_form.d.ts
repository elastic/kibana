import type { ReactNode } from 'react';
import React from 'react';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { LabelStaticOptions } from '../../../../../../common/descriptor_types';
import type { StaticTextProperty } from '../../properties/static_text_property';
interface Props {
    onStaticStyleChange: (propertyName: VECTOR_STYLES, options: LabelStaticOptions) => void;
    staticDynamicSelect?: ReactNode;
    styleProperty: StaticTextProperty;
}
export declare function StaticLabelForm({ onStaticStyleChange, staticDynamicSelect, styleProperty, }: Props): React.JSX.Element;
export {};
