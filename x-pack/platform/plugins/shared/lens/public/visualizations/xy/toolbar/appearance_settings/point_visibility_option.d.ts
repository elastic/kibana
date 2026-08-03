import React from 'react';
import type { PointVisibility } from '@kbn/expression-xy-plugin/common';
export interface PointVisibilityOptionProps {
    enabled: boolean;
    selectedPointVisibility?: PointVisibility;
    onChange: (value: PointVisibility) => void;
}
export declare const PointVisibilityOption: React.FC<PointVisibilityOptionProps>;
