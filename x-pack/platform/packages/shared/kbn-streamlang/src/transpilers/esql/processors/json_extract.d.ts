import type { ESQLAstCommand } from '@elastic/esql/types';
import type { JsonExtractProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang JsonExtractProcessor into a list of ES|QL AST commands.
 *
 * For unconditional extraction (no 'where' or 'where: always'):
 *   Uses EVAL with JSON_EXTRACT() function for each extraction, wrapped in type conversion:
 *   EVAL target_field1 = TO_INTEGER(JSON_EXTRACT(field, "selector1")), target_field2 = JSON_EXTRACT(field, "selector2")
 *
 * For conditional extraction (with 'where' condition):
 *   Uses EVAL with CASE for each extraction:
 *   EVAL target_field = CASE(<condition>, TO_INTEGER(JSON_EXTRACT(field, "selector")), NULL)
 *
 * Type conversion:
 * - keyword (default): No conversion needed (JSON_EXTRACT returns keyword)
 * - integer: TO_INTEGER(JSON_EXTRACT(...))
 * - long: TO_LONG(JSON_EXTRACT(...))
 * - double: TO_DOUBLE(JSON_EXTRACT(...))
 * - boolean: TO_BOOLEAN(JSON_EXTRACT(...))
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * Limitations:
 * - JSON_EXTRACT does not support wildcards, recursive descent, array slicing, filter expressions, or negative array indices
 * - `ignore_failure` has no ES|QL equivalent. In Ingest Pipeline, a failing script processor
 *   can be caught by `ignore_failure: true`; in ES|QL, a runtime error (e.g. non-string input
 *   to JSON_EXTRACT) will fail the entire query. This is an inherent transpilation gap.
 *
 * @example Unconditional with type:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'json_extract',
 *          field: 'message',
 *          extractions: [
 *            { selector: 'user.id', target_field: 'user_id' },
 *            { selector: 'count', target_field: 'event_count', type: 'integer' },
 *          ],
 *        } as JsonExtractProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL `user_id` = JSON_EXTRACT(`message`, "user.id"), `event_count` = TO_INTEGER(JSON_EXTRACT(`message`, "count"))
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'json_extract',
 *          field: 'message',
 *          extractions: [
 *            { selector: 'user.id', target_field: 'user_id', type: 'keyword' },
 *          ],
 *          where: { field: 'status', eq: 'active' },
 *        } as JsonExtractProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL `user_id` = CASE(status == "active", JSON_EXTRACT(`message`, "user.id"), NULL)
 *    ```
 */
export declare function convertJsonExtractProcessorToESQL(processor: JsonExtractProcessor): ESQLAstCommand[];
