import type { ESQLAstCommand } from '@elastic/esql/types';
import type { RemoveByPrefixProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang RemoveByPrefixProcessor into a list of ES|QL AST commands.
 *
 * Removes all nested fields with the given prefix (field.*).
 * Note: When all nested fields are removed, the parent field is also removed by ES|QL.
 *
 * @example:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'remove_by_prefix',
 *          from: 'host',
 *        } as RemoveByPrefixProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | DROP host.*
 *    ```
 */
export declare function convertRemoveByPrefixProcessorToESQL(processor: RemoveByPrefixProcessor): ESQLAstCommand[];
