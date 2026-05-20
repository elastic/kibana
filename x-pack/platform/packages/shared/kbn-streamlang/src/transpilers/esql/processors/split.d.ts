import type { ESQLAstCommand } from '@elastic/esql/types';
import type { SplitProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang SplitProcessor into a list of ES|QL AST commands.
 *
 * For unconditional split (no 'where' or 'where: always'):
 *   Uses EVAL with SPLIT() function: EVAL target_field = SPLIT(field, separator)
 *   If `to` is not provided, updates field in-place: EVAL field = SPLIT(field, separator)
 *
 * For conditional split (with 'where' condition):
 *   Uses EVAL with CASE: EVAL target_field = CASE(<condition>, SPLIT(field, separator), existing_value)
 *   If `to` is not provided, updates field in-place
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * Limitations:
 * - ES|QL's SPLIT function only supports single byte delimiters, while Ingest Pipeline's split
 *   processor supports regex patterns. Complex regex separators may not work identically.
 * - The `preserve_trailing` option from Ingest Pipeline is not directly supported in ES|QL.
 *   ES|QL's SPLIT function behavior for trailing empty strings may differ.
 *
 * @example Unconditional (in-place):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'split',
 *          from: 'tags',
 *          separator: ',',
 *        } as SplitProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags = SPLIT(tags, ",")
 *    ```
 *
 * @example Unconditional (with target field):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'split',
 *          from: 'tags',
 *          to: 'tags_array',
 *          separator: ',',
 *        } as SplitProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags_array = SPLIT(tags, ",")
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'split',
 *          from: 'tags',
 *          separator: ',',
 *          where: { field: 'status', eq: 'active' },
 *        } as SplitProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags = CASE(status == "active", SPLIT(tags, ","), tags)
 *    ```
 */
export declare function convertSplitProcessorToESQL(processor: SplitProcessor): ESQLAstCommand[];
