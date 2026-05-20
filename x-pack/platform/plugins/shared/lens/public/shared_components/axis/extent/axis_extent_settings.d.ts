import React from 'react';
import type { AxisExtentMode, YScaleType, XScaleType } from '@kbn/expression-xy-plugin/common';
import type { UnifiedAxisExtentConfig } from './types';
export declare const LOG_LOWER_BOUND_MAX = 0.01;
export declare const LOWER_BOUND_MAX = 0;
export interface DataBoundsObject {
    min: number;
    max: number;
}
export declare function AxisBoundsControl({ type, canHaveNiceValues, ...props }: {
    type: 'metric' | 'bucket';
    extent: UnifiedAxisExtentConfig;
    setExtent: (newExtent: UnifiedAxisExtentConfig | undefined) => void;
    dataBounds: DataBoundsObject | undefined;
    hasBarOrArea: boolean;
    disableCustomRange: boolean;
    testSubjPrefix: string;
    canHaveNiceValues?: boolean;
    scaleType?: YScaleType | XScaleType;
}): React.JSX.Element;
export declare function getBounds(mode: AxisExtentMode, scaleType?: YScaleType | XScaleType, dataBounds?: DataBoundsObject): Pick<UnifiedAxisExtentConfig, 'lowerBound' | 'upperBound'>;
