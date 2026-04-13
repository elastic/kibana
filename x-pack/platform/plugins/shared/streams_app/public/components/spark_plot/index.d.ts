import type { TickFormatter } from '@elastic/charts';
import React from 'react';
export interface SparkPlotAnnotation {
    id: string;
    x: number;
    color: string;
    icon: React.ReactNode;
    label: React.ReactNode;
}
export declare function SparkPlot({ id, name, type, timeseries, annotations, compressed, xFormatter: givenXFormatter, hideAxis, height, maxYValue, }: {
    id: string;
    name?: string;
    type: 'line' | 'bar';
    timeseries: Array<{
        x: number;
        y: number | null;
    }>;
    annotations: SparkPlotAnnotation[];
    compressed?: boolean;
    xFormatter?: TickFormatter;
    hideAxis?: boolean;
    height?: number;
    maxYValue?: number;
}): React.JSX.Element;
