import type { ESQLAstCommand } from '@elastic/esql/types';
import type { ReplaceProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang ReplaceProcessor into a list of ES|QL AST commands.
 *
 * For unconditional replacement (no 'where' or 'where: always'):
 *   Uses EVAL with replace() function: EVAL target_field = replace(field, pattern, replacement)
 *   If `to` is not provided, updates field in-place: EVAL field = replace(field, pattern, replacement)
 *
 * For conditional replacement (with 'where' condition):
 *   Uses EVAL with CASE: EVAL target_field = CASE(<condition>, replace(field, pattern, replacement), existing_value)
 *   If `to` is not provided, updates field in-place
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * Limitations:
 * - Multi-value arrays are supported in Ingest Pipeline `gsub` processor but cannot be cleanly
 *   handled in ES|QL due to inability to iteratively apply replace or to collapse MV_EXPAND results back to arrays.
 *   See: https://github.com/elastic/elasticsearch/issues/133988
 *
 * @example Unconditional (in-place, with regex):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'replace',
 *          from: 'message',
 *          pattern: '/\\d{3}/', // Regex: replace all three-digit numbers with [NUM]
 *          replacement: '[NUM]',
 *        } as ReplaceProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL message = replace(message, "\\d{3}", "[NUM]")
 *    ```
 *
 * @example Unconditional (with target field):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'replace',
 *          from: 'message',
 *          to: 'clean_message',
 *          pattern: 'error',
 *          replacement: 'warning',
 *        } as ReplaceProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL clean_message = replace(message, "error", "warning")
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'replace',
 *          from: 'message',
 *          pattern: 'error',
 *          replacement: 'warning',
 *          where: { field: 'status', eq: 'test' },
 *        } as ReplaceProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL message = CASE(status == "test", replace(message, "error", "warning"), message)
 *    ```
 */
export declare function convertReplaceProcessorToESQL(processor: ReplaceProcessor): ESQLAstCommand[];
