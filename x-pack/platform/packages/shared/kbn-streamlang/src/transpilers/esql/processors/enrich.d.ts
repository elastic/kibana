import type { ESQLAstCommand } from '@elastic/esql/types';
import type { EnrichPolicyResolver } from '../../../../types/resolvers';
import type { EnrichProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang EnrichProcessor into a list of ES|QL AST commands.
 * @param processor - The EnrichProcessor to convert.
 * @param resolver - The resolver to get the enrich policy metadata.
 * @returns The list of ES|QL AST commands.
 * @example
 * Input:
 * {
 *   action: 'enrich',
 *   policy_name: 'ip_location',
 *   to: 'location',
 *   ignore_missing: false,
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
 * | ENRICH ip_location ON ip WITH location.city = city, location.country = country
 */
export declare const convertEnrichProcessorToESQL: (processor: EnrichProcessor, resolver: EnrichPolicyResolver) => Promise<ESQLAstCommand[]>;
