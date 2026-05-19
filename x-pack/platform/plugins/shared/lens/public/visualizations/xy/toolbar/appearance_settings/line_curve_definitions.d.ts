import type { XYCurveType } from '@kbn/expression-xy-plugin/common';
export interface LineCurveDefinitions {
    type: Extract<XYCurveType, 'LINEAR' | 'CURVE_MONOTONE_X' | 'CURVE_STEP_AFTER'>;
    title: string;
    description?: string;
}
export declare const lineCurveDefinitions: LineCurveDefinitions[];
