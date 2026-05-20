import React from 'react';
import type { XYCurveType } from '@kbn/expression-xy-plugin/common';
export interface LineCurveOptionProps {
    value?: XYCurveType;
    onChange: (type: XYCurveType) => void;
    enabled?: boolean;
}
export declare const LineCurveOption: React.FC<LineCurveOptionProps>;
