import type { BaseIndexPatternColumn, FormulaIndexPatternColumn } from '@kbn/lens-common';
import type { OperationDefinition } from '..';
export declare function isFormulaIndexPatternColumn(column: BaseIndexPatternColumn): column is FormulaIndexPatternColumn;
export declare const formulaOperation: OperationDefinition<FormulaIndexPatternColumn, 'managedReference'>;
