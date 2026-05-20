import type { SerializedEnrichPolicy } from '@kbn/index-management-shared-types';
import type { StreamlangProcessorDefinition } from '../processors';
export type EnrichPolicyResolverMetadata = Pick<SerializedEnrichPolicy, 'matchField' | 'enrichFields'>;
/**
 * Resolver for enrich policies
 * @param policyName - The name of the enrich policy
 * @returns The enrich policy metadata
 * @example
 * Input:
 * 'ip_location'
 *
 * Output:
 * { matchField: 'ip', enrichFields: ['city', 'country'] }
 */
export type EnrichPolicyResolver = (policyName: string) => Promise<EnrichPolicyResolverMetadata | null>;
export type StreamlangResolver = EnrichPolicyResolver;
export interface StreamlangResolverOptions {
    enrich?: EnrichPolicyResolver;
}
export declare const getStreamlangResolverForProcessor: (processor: StreamlangProcessorDefinition, opts?: StreamlangResolverOptions) => StreamlangResolver | undefined;
