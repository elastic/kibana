/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfiguration, ToolSelection } from '@kbn/agent-builder-common';
import { allToolsSelection, allToolsSelectionWildcard } from '@kbn/agent-builder-common';

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
export const ADMIN_INSTRUCTIONS_HEADER = '## Additional instructions (admin)';

const concatInstructions = (base: string, delta: string | undefined): string => {
  if (!delta) {
    return base;
  }
  return `${base}\n\n${ADMIN_INSTRUCTIONS_HEADER}\n${delta}`;
};

const dedupConcat = (base: string[], delta: string[]): string[] => {
  return [...new Set([...base, ...delta])];
};

const mergeToolSelections = (base: ToolSelection[], delta: ToolSelection[]): ToolSelection[] => {
  const concatenated = [...base, ...delta];
  if (concatenated.some((selection) => selection.tool_ids.includes(allToolsSelectionWildcard))) {
    return allToolsSelection;
  }
  const seen = new Set<string>();
  return concatenated.filter((selection) => {
    const key = selection.tool_ids.join(',');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/**
 * Computes an agent's effective configuration by merging its type's base configuration
 * (the floor) with the agent's own configuration (the delta), additively:
 *
 * - instructions: concatenated base-first with a delimiter.
 * - tools / skill_ids / plugin_ids / workflow_ids / connector_ids: union, base-first,
 *   deduplicated. A base that sets `connector_ids: []` pins the floor to "no connectors".
 * - enable_elastic_capabilities: the delta overrides the base when set.
 */
export const mergeAgentConfiguration = (
  base: AgentBaseConfiguration | undefined,
  delta: AgentConfiguration
): AgentConfiguration => {
  const result: AgentConfiguration = { ...delta };
  if (!base) {
    return result;
  }

  if (base.instructions !== undefined) {
    result.instructions = concatInstructions(base.instructions, delta.instructions);
  }
  if (base.tools !== undefined) {
    result.tools = mergeToolSelections(base.tools, delta.tools ?? []);
  }
  if (base.skill_ids !== undefined) {
    result.skill_ids = dedupConcat(base.skill_ids, delta.skill_ids ?? []);
  }
  if (base.plugin_ids !== undefined) {
    result.plugin_ids = dedupConcat(base.plugin_ids, delta.plugin_ids ?? []);
  }
  if (base.workflow_ids !== undefined) {
    result.workflow_ids = dedupConcat(base.workflow_ids, delta.workflow_ids ?? []);
  }
  if (base.connector_ids !== undefined) {
    result.connector_ids = dedupConcat(base.connector_ids, delta.connector_ids ?? []);
  }
  if (base.enable_elastic_capabilities !== undefined) {
    result.enable_elastic_capabilities =
      delta.enable_elastic_capabilities ?? base.enable_elastic_capabilities;
  }

  return result;
};
