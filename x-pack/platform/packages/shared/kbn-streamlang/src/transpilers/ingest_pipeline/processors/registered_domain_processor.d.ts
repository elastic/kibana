import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RegisteredDomainProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang RegisteredDomainProcessor into an Ingest Pipeline registered_domain processor.
 *
 * @example
 * Input:
 * {
 *   action: 'registered_domain',
 *   expression: 'fqdn',
 *   prefix: 'domain',
 * }
 *
 * Output:
 * {
 *   registered_domain: {
 *     field: 'fqdn',
 *     target_field: 'domain',
 *     ignore_missing: true,
 *   },
 * }
 */
export declare function processRegisteredDomainProcessor(processor: Omit<RegisteredDomainProcessor, 'where' | 'action'> & {
    if?: string;
    tag?: string;
}): IngestProcessorContainer;
