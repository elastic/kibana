import type { ESQLAstCommand } from '@elastic/esql/types';
import type { SortProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang SortProcessor into a list of ES|QL AST commands.
 *
 * For unconditional sort (no 'where' or 'where: always'):
 *   Uses EVAL with MV_SORT() function: EVAL target_field = MV_SORT(field, "ASC"|"DESC")
 *   If `to` is not provided, updates field in-place: EVAL field = MV_SORT(field, "ASC"|"DESC")
 *
 * For conditional sort (with 'where' condition):
 *   Uses EVAL with CASE: EVAL target_field = CASE(<condition>, MV_SORT(field, order), existing_value)
 *   If `to` is not provided, updates field in-place
 *
 * For ignore_missing:
 *   Uses EVAL with CASE to check if field is not null before sorting:
 *   EVAL field = CASE(IS_NOT_NULL(field), MV_SORT(field, order), field)
 *
 * Notes:
 * - ES|QL's MV_SORT function sorts a multivalued field in lexicographical order.
 * - The order parameter can be "ASC" (default) or "DESC".
 * - This provides similar functionality to the Ingest Pipeline sort processor.
 *
 * @example Unconditional (in-place, ascending):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'sort',
 *          from: 'tags',
 *        } as SortProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags = MV_SORT(tags, "ASC")
 *    ```
 *
 * @example Unconditional (descending with target field):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'sort',
 *          from: 'values',
 *          to: 'sorted_values',
 *          order: 'desc',
 *        } as SortProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL sorted_values = MV_SORT(values, "DESC")
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'sort',
 *          from: 'tags',
 *          order: 'desc',
 *          where: { field: 'status', eq: 'active' },
 *        } as SortProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags = CASE(status == "active", MV_SORT(tags, "DESC"), tags)
 *    ```
 *
 * @example With ignore_missing:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'sort',
 *          from: 'tags',
 *          ignore_missing: true,
 *        } as SortProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags = CASE(IS_NOT_NULL(tags), MV_SORT(tags, "ASC"), tags)
 *    ```
 */
export declare function convertSortProcessorToESQL(processor: SortProcessor): ESQLAstCommand[];
