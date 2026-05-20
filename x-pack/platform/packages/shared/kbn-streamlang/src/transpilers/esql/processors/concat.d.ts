import type { ESQLAstCommand } from '@elastic/esql/types';
import type { ConcatProcessor } from '../../../../types/processors';
/** *
 * Converts a Streamlang concat processor to ESQL.
 *
 * @example
 * Input:
 * {
 *   action: 'concat',
 *   from: [
 *     { type: 'field', value: 'first_name' },
 *     { type: 'literal', value: ' ' },
 *     { type: 'field', value: 'last_name' },
 *   ],
 *   to: 'full_name',
 * }
 *
 * Output (ignore_missing = false):
 * | EVAL full_name = CASE(first_name IS NULL OR last_name IS NULL, null, CONCAT(first_name, " ", last_name))
 *
 * Output (ignore_missing = true):
 * | EVAL full_name = CONCAT(COALESCE(first_name, ""), " ", COALESCE(last_name, ""))
 */
export declare const convertConcatProcessorToESQL: (processor: ConcatProcessor) => ESQLAstCommand[];
