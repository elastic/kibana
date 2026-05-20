import type { Datatable } from '@kbn/expressions-plugin/public';
import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { FormatFactory } from '../../../common/types';
import type { XYDataLayerConfig } from './types';
interface FormattedMetric {
    layer: string;
    accessor: string;
    fieldFormat: SerializedFieldFormat;
}
export interface AxisGroupConfiguration {
    groupId: string;
    position: 'left' | 'right' | 'bottom' | 'top';
    formatter?: IFieldFormat;
    series: Array<{
        layer: string;
        accessor: string;
    }>;
}
export declare function isFormatterCompatible(formatter1: SerializedFieldFormat, formatter2: SerializedFieldFormat): boolean;
export declare function getXDomain(layers?: XYDataLayerConfig[], tables?: Record<string, Datatable>): {
    min: number;
    max: number;
} | undefined;
export declare function groupAxesByType(layers: XYDataLayerConfig[], tables?: Record<string, Datatable>): {
    auto: FormattedMetric[];
    left: FormattedMetric[];
    right: FormattedMetric[];
    bottom: FormattedMetric[];
};
export declare function getAxesConfiguration(layers: XYDataLayerConfig[], shouldRotate: boolean, tables?: Record<string, Datatable>, formatFactory?: FormatFactory): AxisGroupConfiguration[];
export {};
