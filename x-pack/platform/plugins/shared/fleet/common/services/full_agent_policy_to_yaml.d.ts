import type { FullAgentPolicy } from '../types';
import type { YamlModule } from './yaml_utils';
export declare const fullAgentPolicyToYaml: (policy: FullAgentPolicy, yaml: YamlModule, apiKey?: string) => string;
