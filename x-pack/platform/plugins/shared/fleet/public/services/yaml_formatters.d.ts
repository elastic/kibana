import type { FullAgentPolicy } from '../../common';
import type { FullAgentConfigMap } from '../../common/types/models/agent_cm';
export interface YamlFormatters {
    fullAgentPolicyToYaml: (policy: FullAgentPolicy, apiKey?: string) => string;
    fullAgentConfigMapToYaml: (policy: FullAgentConfigMap) => string;
}
/**
 * Returns YAML formatters that use the asynchronously loaded yaml package.
 * Result is cached so multiple callers share the same load.
 */
export declare const getYamlFormatters: () => Promise<YamlFormatters>;
