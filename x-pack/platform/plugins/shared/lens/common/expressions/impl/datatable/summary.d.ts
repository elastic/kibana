import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DatatableColumnArgs } from '@kbn/lens-common';
type SummaryRowType = Extract<DatatableColumnArgs['summaryRow'], string>;
export declare function getFinalSummaryConfiguration(columnId: string, columnArgs: Pick<DatatableColumnArgs, 'summaryRow' | 'summaryLabel'> | undefined, table: Datatable | undefined): {
    summaryRow: "avg" | "max" | "min" | "sum" | "none" | "count";
    summaryLabel: string;
};
export declare function getDefaultSummaryLabel(type: SummaryRowType): string;
export declare function getSummaryRowOptions(): Array<{
    value: SummaryRowType;
    label: string;
    'data-test-subj': string;
}>;
/** @internal **/
export declare function computeSummaryRowForColumn(columnArgs: DatatableColumnArgs, table: Datatable, formatters: Record<string, FieldFormat>, defaultFormatter: FieldFormat): string;
export {};
