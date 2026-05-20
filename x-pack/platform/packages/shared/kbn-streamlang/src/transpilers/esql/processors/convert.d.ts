import type { ESQLAstCommand } from '@elastic/esql/types';
import type { ConvertProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang ConvertProcessor into a list of ES|QL AST commands.
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(source_field IS NULL)` filters missing source fields
 *
 * Ingest Pipeline throws errors ("field doesn't exist"),
 * while ES|QL uses filtering to exclude such documents entirely.
 *
 * @example:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'convert',
 *          from: 'http.status_code',
 *          to: 'http.status_code_str',
 *          type: 'string',
 *          ignore_missing: true,
 *          where: { field: 'http.error', exists: true },
 *        } as ConvertProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates (conceptually):
 *    ```txt
 *    // | WHERE NOT(size IS NULL)  // Only if ignore_missing = false
 *    | EVAL http.status_code_str = CASE(NOT(`http.error` IS NULL), TO_STRING(http.status_code), null)
 *    ```
 */
export declare function convertConvertProcessorToESQL(processor: ConvertProcessor): ESQLAstCommand[];
