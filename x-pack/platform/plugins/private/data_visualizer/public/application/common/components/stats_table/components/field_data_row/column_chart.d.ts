import type { FC } from 'react';
import type { EuiDataGridColumn } from '@elastic/eui';
import { type ChartData } from '@kbn/ml-data-grid';
interface Props {
    chartData: ChartData;
    columnType: EuiDataGridColumn;
    dataTestSubj: string;
    hideLabel?: boolean;
    maxChartColumns: number;
    isNumeric?: boolean;
}
export declare const ColumnChart: FC<Props>;
export {};
