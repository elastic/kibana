import type { ReactNode } from 'react';
import React from 'react';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { CustomIcon, IconDynamicOptions } from '../../../../../../common/descriptor_types';
import type { StyleField } from '../../style_fields_helper';
import type { DynamicIconProperty } from '../../properties/dynamic_icon_property';
interface Props {
    customIcons: CustomIcon[];
    fields: StyleField[];
    onCustomIconsChange: (customIcons: CustomIcon[]) => void;
    onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: IconDynamicOptions) => void;
    staticDynamicSelect?: ReactNode;
    styleProperty: DynamicIconProperty;
}
export declare function DynamicIconForm({ fields, onDynamicStyleChange, onCustomIconsChange, customIcons, staticDynamicSelect, styleProperty, }: Props): React.JSX.Element;
export {};
