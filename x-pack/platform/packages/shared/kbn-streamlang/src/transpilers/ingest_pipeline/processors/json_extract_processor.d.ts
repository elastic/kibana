import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { JsonExtractProcessor } from '../../../../types/processors';
/**
 * Converts a JsonExtractProcessor to an Ingest Pipeline script processor.
 *
 * @example
 * Input:
 *   {
 *     action: 'json_extract',
 *     field: 'message',
 *     extractions: [
 *       { selector: 'user_id', target_field: 'user.id' },
 *       { selector: '$.metadata.client.ip', target_field: 'client_ip' }
 *     ]
 *   }
 *
 * Output:
 *   { script: { lang: 'painless', source: '...' } }
 */
export declare function processJsonExtractProcessor(processor: Omit<JsonExtractProcessor, 'where' | 'action'> & {
    if?: string;
    tag?: string;
}): IngestProcessorContainer;
