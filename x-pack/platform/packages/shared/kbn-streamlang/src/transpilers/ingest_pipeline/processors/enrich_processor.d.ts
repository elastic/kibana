import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EnrichProcessor } from '../../../../types/processors';
import type { EnrichPolicyResolver } from '../../../../types/resolvers';
/**
 * Converts a Streamlang EnrichProcessor into an Ingest Pipeline enrich processor. Uses a resolver to get the enrich policy metadata.
 * @param processor - The EnrichProcessor to convert.
 * @param resolver - The resolver to get the enrich policy metadata.
 * @returns The Ingest Pipeline enrich processor.
 * @example
 * Input:
 * {
 *   action: 'enrich',
 *   policy_name: 'ip_location',
 *   to: 'location',
 * }
 *
 * Resolver:
 * (policyName: string) => Promise<EnrichPolicyMetadata | null>
 *
 * Return:
 * {
 *   matchField: 'ip',
 *   enrichFields: ['city', 'country'],
 * }
 *
 * Output:
 * {
 *   enrich: {
 *     policy_name: 'ip_location',
 *     field: 'ip',
 *     target_field: 'location',
 *   },
 */
export declare const processEnrichProcessor: (processor: Omit<EnrichProcessor, "where" | "action" | "to"> & {
    if?: string;
    target_field: string;
    tag?: string;
}, resolver: EnrichPolicyResolver) => Promise<IngestProcessorContainer>;
