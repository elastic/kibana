/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlindBehindText } from '@elastic/eui';
import type {
  AgentOptionValue,
  AgentSelection,
  GroupOption,
  GroupOptionValue,
  Overlap,
  SelectedGroups,
} from './types';
import { AGENT_GROUP_KEY } from './types';

export const getNumOverlapped = (
  { policy = {}, platform = {} }: SelectedGroups,
  overlap: Overlap
) => {
  let sum = 0;
  Object.keys(platform).forEach((plat) => {
    const policies = overlap[plat] ?? {};
    Object.keys(policy).forEach((pol) => {
      sum += policies[pol] ?? 0;
    });
  });

  return sum;
};

export const generateColorPicker = () => {
  const visColorsBehindText = euiPaletteColorBlindBehindText();
  const typeColors = new Map<AGENT_GROUP_KEY, string>();

  return (type: AGENT_GROUP_KEY) => {
    if (!typeColors.has(type)) {
      typeColors.set(type, visColorsBehindText[typeColors.size]);
    }

    return typeColors.get(type);
  };
};

export const getNumAgentsInGrouping = (selectedGroups: SelectedGroups) => {
  let sum = 0;
  Object.keys(selectedGroups).forEach((g) => {
    const group = selectedGroups[g];
    sum += Object.keys(group).reduce((acc, k) => acc + group[k], 0);
  });

  return sum;
};

export const generateAgentCheck =
  (selectedGroups: SelectedGroups) =>
  ({ groups }: AgentOptionValue) =>
    Object.keys(groups)
      .map((group) => {
        const selectedGroup = selectedGroups[group];
        const agentGroup = groups[group];

        // check if the agent platform/policy is selected
        return selectedGroup[agentGroup];
      })
      .every((a) => !a);

export const generateAgentSelection = (
  selection: GroupOption[]
): {
  newAgentSelection: AgentSelection;
  selectedAgents: AgentOptionValue[];
  selectedGroups: SelectedGroups;
} => {
  const newAgentSelection: AgentSelection = {
    agents: [],
    allAgentsSelected: false,
    platformsSelected: [],
    policiesSelected: [],
    offlineAgentsSelected: false,
  };
  // parse through the selections to be able to determine how many are actually selected
  const selectedAgents: AgentOptionValue[] = [];
  const selectedGroups: SelectedGroups = {
    policy: {},
    platform: {},
  };

  for (const opt of selection) {
    const groupType = opt.value?.groupType;
    // best effort to get the proper identity
    const key = opt.key ?? opt.value?.id ?? opt.label;
    let value;
    switch (groupType) {
      case AGENT_GROUP_KEY.All:
        newAgentSelection.allAgentsSelected = true;
        break;
      case AGENT_GROUP_KEY.Platform:
        value = opt.value as GroupOptionValue;
        if (!newAgentSelection.allAgentsSelected) {
          // we don't need to calculate diffs when all agents are selected
          selectedGroups.platform[key] = value.size;
        }

        newAgentSelection.platformsSelected.push(key);
        break;
      case AGENT_GROUP_KEY.Policy:
        value = opt.value as GroupOptionValue;
        if (!newAgentSelection.allAgentsSelected) {
          // we don't need to calculate diffs when all agents are selected
          selectedGroups.policy[key] = value.size;
        }

        newAgentSelection.policiesSelected.push(key);
        break;
      case AGENT_GROUP_KEY.Agent:
        value = opt.value as AgentOptionValue;
        if (!newAgentSelection.allAgentsSelected) {
          // we don't need to count how many agents are selected if they are all selected
          selectedAgents.push(value);
        }

        newAgentSelection.agents.push(key);
        if (opt.disabled) {
          newAgentSelection.offlineAgentsSelected = true;
        }

        break;
      default:
        // this should never happen!
        // eslint-disable-next-line no-console
        console.error(`unknown group type ${groupType}`);
    }
  }

  return { newAgentSelection, selectedGroups, selectedAgents };
};

/**
 * Check if the Osquery component is healthy for a given agent.
 * A component is considered healthy if its status is either HEALTHY or DEGRADED.
 * Degraded components can still process queries successfully.
 *
 * SECURITY NOTE: Component status is validated by Fleet server based on agent check-ins
 * and integration health checks. This data is trusted as it comes from the Fleet API,
 * not directly from agents.
 *
 * @param agent - Agent object containing components array
 * @returns true if Osquery component status is HEALTHY or DEGRADED, false otherwise
 */
export const isOsqueryComponentHealthy = (agent: {
  components?: Array<{ id: string; type: string; status: string }>;
}): boolean => {
  if (!agent.components || agent.components.length === 0) {
    return false;
  }

  console.log({ agentC: agent.components });
  // Find the osquery component by type
  const osqueryComponent = agent.components.find((component) => component.type === 'osquery');

  // Component is healthy if status is HEALTHY or DEGRADED (degraded means partially working)
  return osqueryComponent?.status === 'HEALTHY' || osqueryComponent?.status === 'DEGRADED';
};

/**
 * Determine agent availability status for Osquery queries
 *
 * Status Mapping Table:
 * ┌────────────────────┬─────────────────────┬────────────────────┬─────────────┬──────────────┐
 * │ Status             │ Agent Checking In?  │ Osquery Working?   │ Visual      │ Selectable?  │
 * ├────────────────────┼─────────────────────┼────────────────────┼─────────────┼──────────────┤
 * │ 'online'           │ ✅ Yes              │ ✅ Yes             │ 🟢 Green    │ ✅ Yes       │
 * │ 'degraded'         │ ✅ Yes              │ ✅ Yes             │ 🟠 Orange+⚠│ ✅ Yes       │
 * │ 'osquery_unavail'  │ ✅ Yes              │ ❌ No              │ 🔴 Red      │ ❌ No        │
 * │ 'offline'          │ ❌ No               │ ❌ No              │ 🔴 Red      │ ❌ No        │
 * └────────────────────┴─────────────────────┴────────────────────┴─────────────┴──────────────┘
 *
 * Returns:
 * - 'online': Agent fully healthy and Osquery component healthy
 * - 'degraded': Agent unhealthy but Osquery component is healthy (queries will work)
 * - 'osquery_unavailable': Agent checking in but Osquery component failed (queries won't work)
 * - 'offline': Agent not checking in at all (completely unreachable)
 *
 * @param agent - Agent object with status, components, and last_checkin from Fleet API
 */
export const getAgentOsqueryAvailability = (agent: {
  status?: string;
  components?: Array<{ id: string; type: string; status: string }>;
  last_checkin?: string;
}): 'online' | 'degraded' | 'osquery_unavailable' | 'offline' => {
  // Trust the Fleet status field as the source of truth for offline detection
  // This aligns with backend filtering: 'NOT status:offline' in parse_agent_groups.ts
  // Fleet server computes status based on check-in timing and agent health
  if (agent.status === 'offline') {
    return 'offline';
  }

  // At this point: agent is checking in (status is not offline)
  // Check if Osquery component is healthy
  const osqueryHealthy = isOsqueryComponentHealthy(agent);

  // If Osquery is NOT healthy, agent is reachable but Osquery won't work
  if (!osqueryHealthy) {
    return 'osquery_unavailable';
  }

  // At this point: agent is checking in AND Osquery is healthy
  // Check if agent overall is degraded
  if (agent.status !== 'online') {
    return 'degraded'; // Agent degraded but Osquery works - queries will succeed
  }

  // Agent is online and Osquery is healthy
  return 'online';
};
