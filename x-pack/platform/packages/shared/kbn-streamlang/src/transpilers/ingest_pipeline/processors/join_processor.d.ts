import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { JoinProcessor } from '../../../../types/processors';
/**
 * Converts a JoinProcessor to an Ingest Pipeline script processor.
 *
 * @example
 * Input:
 *   { action: 'join', from: ['field1', 'field2'], delimiter: ', ', to: 'my_joined_field' }
 *
 * Output:
 *   { script: { lang: 'painless', source: "
 *    def fields = [];
 *    boolean allPresent = true;
 *
 *    if (ctx.containsKey('field1') && ctx['field1'] != null) {
 *      fields.add(ctx['field1'].toString());
 *    } else {
 *      allPresent = false;
 *    }
 *
 *    if (ctx.containsKey('field2') && ctx['field2'] != null) {
 *      fields.add(ctx['field2'].toString());
 *    } else {
 *      allPresent = false;
 *    }
 *
 *    if (false || allPresent) {
 *      ctx['my_joined_field'] = fields.stream().collect(Collectors.joining(', '));
 *    }
 *   " } }
 */
export declare const processJoinProcessor: (processor: Omit<JoinProcessor, "where" | "action" | "to"> & {
    if?: string;
    field: string;
    tag?: string;
}) => IngestProcessorContainer;
