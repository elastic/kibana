import type { FC } from 'react';
import type { RectAnnotationSpec } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
interface BrushAnnotationProps {
    id: string;
    min: number;
    max: number;
    style?: RectAnnotationSpec['style'];
}
/**
 * DualBrushAnnotation React Component
 * Dual brush annotation component that overlays the document count chart
 *
 * @param props BrushAnnotationProps component props
 * @returns The DualBrushAnnotation component.
 */
export declare const DualBrushAnnotation: FC<BrushAnnotationProps>;
export {};
