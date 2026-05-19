import { BehaviorSubject } from 'rxjs';
import type { EuiDataGridColumn } from '@elastic/eui';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { type ChartData, type ChartDataItem } from '@kbn/ml-data-grid';
import { useColumnChartStyles } from './column_chart_styles';
export declare const hoveredRow$: BehaviorSubject<any>;
export declare const BAR_COLOR: string;
type XScaleType = 'ordinal' | 'time' | 'linear' | undefined;
export declare const getXScaleType: (kbnFieldType: KBN_FIELD_TYPES | undefined) => XScaleType;
export declare const getFieldType: (schema: EuiDataGridColumn["schema"]) => KBN_FIELD_TYPES | undefined;
type LegendText = string | JSX.Element;
export declare const getLegendText: (chartData: ChartData, maxChartColumns: number, isNumeric: boolean | undefined, styles: ReturnType<typeof useColumnChartStyles>) => LegendText;
interface ColumnChart {
    data: ChartDataItem[];
    legendText: LegendText;
    xScaleType: XScaleType;
}
export declare const useColumnChart: (chartData: ChartData, columnType: EuiDataGridColumn, maxChartColumns: number, isNumeric?: boolean) => ColumnChart;
export {};
