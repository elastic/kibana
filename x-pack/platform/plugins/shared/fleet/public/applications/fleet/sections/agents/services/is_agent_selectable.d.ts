import type { Agent, AgentPolicy } from '../../../types';
/**
 * Returns true if the given agent can be selected in the Fleet agents list for
 * bulk actions. Used by the table's `selection.selectable` and by the parent
 * page's `selectableAgents` count / "select all" filter.
 *
 * OpAMP collectors live on an auto-created managed policy by design; bulk
 * actions applicable to them (export, remove collector) should still be allowed.
 */
export declare function isAgentSelectable(agent: Agent, agentPoliciesIndexedById: Record<string, AgentPolicy>): boolean;
