import type { ReactNode } from 'react';
import React from 'react';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { CustomIcon, IconStaticOptions } from '../../../../../../common/descriptor_types';
import type { StaticIconProperty } from '../../properties/static_icon_property';
interface Props {
    customIcons: CustomIcon[];
    onCustomIconsChange: (customIcons: CustomIcon[]) => void;
    onStaticStyleChange: (propertyName: VECTOR_STYLES, options: IconStaticOptions) => void;
    staticDynamicSelect?: ReactNode;
    styleProperty: StaticIconProperty;
}
export declare function StaticIconForm({ onStaticStyleChange, onCustomIconsChange, customIcons, staticDynamicSelect, styleProperty, }: Props): React.JSX.Element;
export {};
