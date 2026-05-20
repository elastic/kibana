import { type FC } from 'react';
import { type EuiDataGridColumn } from '@elastic/eui';
import type { ChartData } from '../lib/field_histograms';
interface Props {
    chartData: ChartData;
    columnType: EuiDataGridColumn;
    dataTestSubj: string;
    hideLabel?: boolean;
    maxChartColumns?: number;
}
export declare const ColumnChart: FC<Props>;
export {};
