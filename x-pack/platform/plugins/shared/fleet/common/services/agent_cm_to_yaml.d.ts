import type { FullAgentConfigMap } from '../types/models/agent_cm';
import type { YamlModule } from './yaml_utils';
export declare const fullAgentConfigMapToYaml: (policy: FullAgentConfigMap, yaml: YamlModule) => string;
