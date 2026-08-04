import { BehaviorSubject } from 'rxjs';
import { type EuiDataGridColumn, type EuiThemeComputed } from '@elastic/eui';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { ChartData, ChartDataItem } from '../lib/field_histograms';
import type { DataGridItem } from '../lib/types';
export declare const hoveredRow$: BehaviorSubject<DataGridItem | null>;
export declare const BAR_COLOR: string;
type XScaleType = 'ordinal' | 'time' | 'linear' | undefined;
export declare const getXScaleType: (kbnFieldType: KBN_FIELD_TYPES | undefined) => XScaleType;
/**
 * Gets the Kibana field type from a EUI data grid column schema.
 *
 * @param {EuiDataGridColumn['schema']} schema - EUI data grid column schema.
 * @returns {(KBN_FIELD_TYPES | undefined)}
 */
export declare const getFieldType: (schema: EuiDataGridColumn["schema"]) => KBN_FIELD_TYPES | undefined;
type LegendText = string | JSX.Element;
export declare const getLegendText: (chartData: ChartData, euiTheme: EuiThemeComputed, maxChartColumns?: number) => LegendText;
interface ColumnChart {
    data: ChartDataItem[];
    legendText: LegendText;
    xScaleType: XScaleType;
}
/**
 * Custom hook to manage state of a DataGrid column chart.
 *
 * @param {ChartData} chartData - The original chart data to be transformed into the ColumnChart's format.
 * @param {EuiDataGridColumn} columnType - EUI column type.
 * @param {?number} [maxChartColumns] - Maximum number of chart columns.
 * @returns {ColumnChart}
 */
export declare const useColumnChart: (chartData: ChartData, columnType: EuiDataGridColumn, maxChartColumns?: number) => ColumnChart;
export {};
