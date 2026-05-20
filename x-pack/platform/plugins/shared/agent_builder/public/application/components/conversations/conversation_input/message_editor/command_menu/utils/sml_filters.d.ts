import type { AgentDefinition } from '@kbn/agent-builder-common/agents/definition';
import type { SmlSearchFilters } from '@kbn/agent-context-layer-plugin/public';
export declare const buildSmlFiltersFromAgent: (agent: AgentDefinition | null) => SmlSearchFilters | undefined;
