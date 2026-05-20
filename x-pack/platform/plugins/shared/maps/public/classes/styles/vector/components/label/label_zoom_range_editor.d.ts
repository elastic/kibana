import React from 'react';
import type { LabelZoomRangeStylePropertyDescriptor } from '../../../../../../common/descriptor_types';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import type { LabelZoomRangeProperty } from '../../properties/label_zoom_range_property';
interface Props {
    disabled: boolean;
    disabledBy: VECTOR_STYLES;
    handlePropertyChange: (propertyName: VECTOR_STYLES, stylePropertyDescriptor: LabelZoomRangeStylePropertyDescriptor) => void;
    styleProperty: LabelZoomRangeProperty;
}
export declare function LabelZoomRangeEditor(props: Props): React.JSX.Element;
export {};
