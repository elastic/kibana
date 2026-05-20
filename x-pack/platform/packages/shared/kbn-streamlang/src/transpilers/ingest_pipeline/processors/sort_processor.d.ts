import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
interface SortIngestProcessor {
    field: string;
    target_field?: string;
    order?: 'asc' | 'desc';
    ignore_missing?: boolean;
    ignore_failure?: boolean;
    if?: string;
    description?: string;
    tag?: string;
}
/**
 * Processes a sort processor, handling the ignore_missing flag.
 *
 * Since the native ES sort processor doesn't support ignore_missing,
 * we simulate it by adding a Painless condition that checks if the field exists.
 *
 * When ignore_missing is true and no 'where' condition:
 *   "if": "ctx.containsKey('field') && ctx['field'] != null"
 *
 * When ignore_missing is true with 'where' condition:
 *   The existence check is prepended to the existing Painless script.
 */
export declare function processSortProcessor(processor: SortIngestProcessor): IngestProcessorContainer[];
export {};
