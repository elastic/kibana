import type { FC } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { ChangePointAnnotation, FieldConfig } from './change_point_detection_context';
export interface ChartComponentProps {
    fieldConfig: FieldConfig;
    annotation: ChangePointAnnotation;
    interval: string;
    onLoading?: (isLoading: boolean) => void;
    onRenderComplete?: () => void;
}
export interface ChartComponentPropsAll {
    fn: string;
    metricField: string;
    splitField?: string;
    maxResults: number;
    timeRange: TimeRange;
    filters?: Filter[];
    query?: Query;
}
export declare const ChartComponent: FC<ChartComponentProps>;
