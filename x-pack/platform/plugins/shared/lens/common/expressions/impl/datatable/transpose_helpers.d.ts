import type { Datatable } from '@kbn/expressions-plugin/common';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { DatatableArgs } from '../../defs/datatable/datatable';
/**
 * Transposes the columns of the given table as defined in the arguments.
 * This function modifies the passed in args and firstTable objects.
 * This process consists out of three parts:
 *
 * * Calculating the new column arguments
 * * Calculating the new datatable columns
 * * Calculating the new rows
 *
 * If the table is transposed by multiple columns, this process is repeated on top of the previous transformation.
 */
export declare function transposeTable(args: DatatableArgs, firstTable: Datatable, formatters: Record<string, FieldFormat>): void;
