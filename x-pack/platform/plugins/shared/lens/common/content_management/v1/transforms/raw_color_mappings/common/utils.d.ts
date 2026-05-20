import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import type { GenericIndexPatternColumn, StructuredDatasourceStates } from '@kbn/lens-common';
export interface ColumnMeta {
    fieldType?: string | 'multi_terms' | 'range';
    dataType?: GenericIndexPatternColumn['dataType'] | DatatableColumnType;
}
export declare function getColumnMetaFn(datasourceStates?: StructuredDatasourceStates): ((layerId: string, columnIds: string[]) => ColumnMeta) | null;
