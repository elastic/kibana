import React from 'react';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import type { LabelPositionStylePropertyDescriptor } from '../../../../../../common/descriptor_types';
import type { LabelPositionProperty } from '../../properties/label_position_property';
interface Props {
    hasLabel: boolean;
    handlePropertyChange: (propertyName: VECTOR_STYLES, stylePropertyDescriptor: LabelPositionStylePropertyDescriptor) => void;
    styleProperty: LabelPositionProperty;
}
export declare function LabelPositionEditor({ hasLabel, handlePropertyChange, styleProperty }: Props): React.JSX.Element;
export {};
