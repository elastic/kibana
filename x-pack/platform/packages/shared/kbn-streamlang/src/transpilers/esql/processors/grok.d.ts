import type { ESQLAstCommand } from '@elastic/esql/types';
import type { GrokProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang GrokProcessor into a list of ES|QL AST commands.
 *
 * Conditional execution logic:
 *  - If neither `ignore_missing` nor `where` is provided: emit a single GROK command.
 *  - Otherwise, use CASE approach to conditionally execute GROK:
 *      * Create temporary field and use CASE to conditionally set source field or empty string (empty string avoids ES|QL NULL errors)
 *      * Apply GROK to temporary field
 *      * Drop temporary field
 *    Condition: (exists(from) if ignore_missing) AND (where condition, if provided)
 *
 * Type handling:
 *  - Pre-grok: cast all GROKed target fields to their suffixed (or default) types with
 *              TO_STRING (keyword), TO_INTEGER or TO_DOUBLE for consistency.
 *
 * @example:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'grok',
 *          from: 'message',
 *          patterns: ["%{IP:client.ip} %{NUMBER:size:int} %{NUMBER:burn_rate:float}"],
 *          ignore_missing: true,
 *          where: { field: 'flags.process', exists: true },
 *        } as GrokProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates (conceptually):
 *    ```txt
 *    // | WHERE NOT(message IS NULL)  // Only if ignore_missing = false
 *    | EVAL `client.ip` = TO_STRING(`client.ip`)
 *    | EVAL `size` = TO_INTEGER(`size`)
 *    | EVAL `burn_rate` = TO_DOUBLE(`burn_rate`)
 *    | EVAL __temp_grok_where_message__ = CASE(NOT(message IS NULL) AND NOT(`flags.process` IS NULL), message, "")
 *    | GROK __temp_grok_where_message__ "%{IP:client.ip} %{NUMBER:size:int} %{NUMBER:burn_rate:float}"
 *    | DROP __temp_grok_where_message__
 *    ```
 */
export declare function convertGrokProcessorToESQL(processor: GrokProcessor): ESQLAstCommand[];
