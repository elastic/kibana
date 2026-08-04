import type { AgentDefinition } from '@kbn/agent-builder-common/agents/definition';
import type { SmlSearchConstraints } from '@kbn/agent-builder-sml-plugin/public';
export declare const buildSmlScopingFromAgent: (agent: AgentDefinition | null) => SmlSearchConstraints | undefined;
