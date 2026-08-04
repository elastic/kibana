import { type FC } from 'react';
import type { FieldConfig, SelectedChangePoint } from './change_point_detection_context';
import { type ChangePointAnnotation } from './change_point_detection_context';
import { type ChartComponentProps } from './chart_component';
export interface ChangePointsTableProps {
    annotations: ChangePointAnnotation[];
    fieldConfig: FieldConfig;
    isLoading: boolean;
    onSelectionChange?: (update: SelectedChangePoint[]) => void;
    onRenderComplete?: () => void;
}
export declare const ChangePointsTable: FC<ChangePointsTableProps>;
export declare const MiniChartPreview: FC<ChartComponentProps>;
