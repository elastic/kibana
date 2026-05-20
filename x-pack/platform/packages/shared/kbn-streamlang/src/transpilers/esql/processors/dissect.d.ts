import type { ESQLAstCommand } from '@elastic/esql/types';
import type { DissectProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang DissectProcessor into a list of ES|QL AST commands.
 *
 * Conditional execution logic:
 *  - If neither `ignore_missing` nor `where` is provided: emit a single DISSECT command.
 *  - Otherwise, use CASE approach to conditionally execute DISSECT:
 *      * Create temporary field using CASE to conditionally set to source field or empty string (empty string avoids ES|QL NULL errors)
 *      * Apply DISSECT to temporary field
 *      * Drop temporary field
 *    Condition: (exists(from) if ignore_missing) AND (where condition, if provided)
 *
 * Type handling:
 *  - Pre-dissect: cast all prospective DISSECT output fields to avoid ES|QL's type conflict errors.
 *  - DISSECT yields keyword (string) values; further casts are user driven.
 *
 *  @example
 *     ```typescript
 *     const streamlangDSL: StreamlangDSL = {
 *        steps: [
 *          {
 *            action: 'dissect',
 *            from: 'message',
 *            pattern: '[%{log.level}] %{client.ip}',
 *            ignore_missing: true,
 *            where: {
 *              field: 'flags.process',
 *              exists: true,
 *            },
 *          } as DissectProcessor,
 *        ],
 *      };
 *    ```
 *
 *   Generates (conceptually):
 *    ```txt
 *      // | WHERE NOT(message IS NULL)  // Only if ignore_missing = false
 *      | EVAL `log.level` = TO_STRING(`log.level`)
 *      | EVAL `client.ip` = TO_STRING(`client.ip`)
 *      | EVAL __temp_dissect_where_message__ = CASE(NOT(message IS NULL) AND NOT(`flags.process` IS NULL), message, "")
 *      | DISSECT __temp_dissect_where_message__ "[%{log.level}] %{client.ip}"
 *      | DROP __temp_dissect_where_message__
 *    ```
 */
export declare function convertDissectProcessorToESQL(processor: DissectProcessor): ESQLAstCommand[];
