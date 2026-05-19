import type { AgentPolicy, PackagePolicy, OutputType, ValueOf, Output } from '../types';
/**
 * Return allowed output type for a given agent policy,
 * Fleet Server and APM cannot use anything else than same cluster ES
 */
export declare function getAllowedOutputTypesForAgentPolicy(agentPolicy: Partial<AgentPolicy>): string[];
/**
 * Return allowed output type for a given package policy
 */
export declare function getAllowedOutputTypesForPackagePolicy(packagePolicy: Pick<PackagePolicy, 'supports_agentless'>): string[];
export declare function getAllowedOutputTypesForIntegration(packageName?: string): string[];
export declare function outputYmlIncludesReservedPerformanceKey(configYml: string, safeLoad: (yml: string) => any): boolean;
export declare function getDefaultPresetForEsOutput(configYaml: string, safeLoad: (yml: string) => any): 'balanced' | 'custom';
export declare function outputTypeSupportPresets(type: ValueOf<OutputType>): boolean;
/**
 * Get id used in full agent policy (sent to the agents)
 * we use "default" for the default policy to avoid breaking changes
 */
export declare function getOutputIdForAgentPolicy(output: Pick<Output, 'id' | 'is_default' | 'type'>): string;
