import type { ReactNode } from 'react';
import React from 'react';
import type { SizeStaticOptions } from '../../../../../../common/descriptor_types';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { StaticSizeProperty } from '../../properties/static_size_property';
interface Props {
    onStaticStyleChange: (propertyName: VECTOR_STYLES, options: SizeStaticOptions) => void;
    staticDynamicSelect?: ReactNode;
    styleProperty: StaticSizeProperty;
}
export declare function StaticSizeForm({ onStaticStyleChange, staticDynamicSelect, styleProperty }: Props): React.JSX.Element;
export {};
