import type { AgentConfiguration } from '@kbn/agent-builder-common';
/**
 * The managed base configuration carried by an agent type. Fields set here are the
 * floor for every agent of that type; fields left unset keep the agent's own value
 * (including legacy "undefined means all" semantics for skill_ids / connector_ids).
 */
export type AgentBaseConfiguration = Partial<AgentConfiguration>;
/**
 * Delimiter inserted between a type's base instructions and the agent's own
 * instructions in the merged output, keeping both sections legible.
 */
export declare const ADMIN_INSTRUCTIONS_HEADER = "## Additional instructions (admin)";
/**
 * Computes an agent's effective configuration by merging its type's base configuration
 * (the floor) with the agent's own configuration (the delta), additively:
 *
 * - instructions: concatenated base-first with a delimiter.
 * - tools / skill_ids / plugin_ids / workflow_ids / connector_ids: union, base-first,
 *   deduplicated. A base that sets `connector_ids: []` pins the floor to "no connectors".
 * - enable_elastic_capabilities: the delta overrides the base when set.
 */
export declare const mergeAgentConfiguration: (base: AgentBaseConfiguration | undefined, delta: AgentConfiguration) => AgentConfiguration;
