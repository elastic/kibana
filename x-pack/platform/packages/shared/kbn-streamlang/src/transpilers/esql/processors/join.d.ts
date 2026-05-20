import type { ESQLAstCommand } from '@elastic/esql/types';
import type { JoinProcessor } from '../../../../types/processors';
/**
 * Converts a JoinProcessor into a list of ES|QL AST commands.
 *
 * With `where` condition:
 *   EVAL <to> = CASE(<where>, CONCAT(<field1>, <delimiter>, <field2>, <delimiter>, ...), NULL)
 *
 * With `ignore_missing: true`:
 *   EVAL <to> = CONCAT(CASE(<field1> IS NULL, "", <field1>), CASE(<field1> IS NULL, "", <delimiter>), ...)
 *
 * @example
 *   { action: 'join', from: ['field1', 'field2', 'field3'], delimiter: '-', to: 'my_joined_field' }
 *   -> EVAL my_joined_field = CONCAT(field1, '-', field2, '-', field3)
 *
 * @example
 *   { action: 'join', from: ['field1', 'field2', 'field3'], delimiter: '-', to: 'my_joined_field', where: { field: 'field1', eq: 'value' } }
 *   -> EVAL my_joined_field = CASE(field1 == "value", CONCAT(field1, '-', field2, '-', field3), NULL)
 */
export declare function convertJoinProcessorToESQL(processor: JoinProcessor): ESQLAstCommand[];
