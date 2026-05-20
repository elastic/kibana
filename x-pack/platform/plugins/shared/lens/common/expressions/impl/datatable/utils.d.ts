import { type Datatable, type DatatableColumnMeta } from '@kbn/expressions-plugin/common';
/**
 * Returns true for numerical fields
 *
 * Excludes the following types:
 *  - `range` - Stringified range
 *  - `multi_terms` - Multiple values
 *  - `filters` - Arbitrary label
 *  - Last value with array values
 *
 * **Note**: use this utility function only at the expression level,
 * not before (i.e. to decide if a column in numeric in a configuration panel)
 */
export declare function isNumericField(meta?: DatatableColumnMeta): boolean;
export declare function getDatatableColumn(table: Datatable | undefined, accessor: string): import("@kbn/expressions-plugin/common").DatatableColumn | undefined;
export declare function getFieldMetaFromDatatable(table: Datatable | undefined, accessor: string): DatatableColumnMeta | undefined;
export declare function getFieldTypeFromDatatable(table: Datatable | undefined, accessor: string): import("@kbn/expressions-plugin/common").DatatableColumnType | undefined;
/**
 * Returns true for numerical fields, excluding ranges
 *
 * **Note**: use this utility function only at the expression level,
 * not before (i.e. to decide if a column in numeric in a configuration panel)
 */
export declare function isNumericFieldForDatatable(table: Datatable | undefined, accessor: string): boolean;
