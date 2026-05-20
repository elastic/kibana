import type { ESQLAstCommand } from '@elastic/esql/types';
import type { RemoveProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang RemoveProcessor into a list of ES|QL AST commands.
 *
 * For unconditional removal (no 'where' or 'where: always'):
 *   Uses DROP command to remove the field
 *
 * For conditional removal (with 'where' condition):
 *   Uses EVAL with CASE to set field to null when condition matches:
 *   EVAL field = CASE(<condition>, null, field)
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * @example Unconditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'remove',
 *          from: 'temp_field',
 *        } as RemoveProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | DROP temp_field
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'remove',
 *          from: 'temp_field',
 *          where: { field: 'status', eq: 'test' },
 *        } as RemoveProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL temp_field = CASE(status == "test", null, temp_field)
 *    ```
 */
export declare function convertRemoveProcessorToESQL(processor: RemoveProcessor): ESQLAstCommand[];
