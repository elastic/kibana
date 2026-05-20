import type { ESQLAstCommand } from '@elastic/esql/types';
import type { MathProcessor } from '../../../../types/processors';
/**
 * Converts a MathProcessor to ES|QL commands
 *
 * Generates: EVAL <to> = <expression>
 *
 * With `where` condition:
 *   EVAL <to> = CASE(<where>, <expression>, <to>)
 *
 * With `ignore_missing: true`:
 *   EVAL <to> = CASE(field1 IS NOT NULL AND field2 IS NOT NULL, <expression>, <to>)
 *
 * @example
 *   { action: 'math', expression: 'price * quantity', to: 'total' }
 *   -> EVAL total = price * quantity
 *
 * @example
 *   { action: 'math', expression: 'abs(price - 10)', to: 'diff', where: { field: 'active', eq: true } }
 *   -> EVAL diff = CASE(active == true, ABS(price - 10), diff)
 */
export declare function convertMathProcessorToESQL(processor: MathProcessor): ESQLAstCommand[];
