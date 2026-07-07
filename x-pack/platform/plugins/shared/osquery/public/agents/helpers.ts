/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlindBehindText } from '@elastic/eui';
import type { FleetServerAgentComponentStatus } from '@kbn/fleet-plugin/common';
import type {
  AgentOptionValue,
  AgentSelection,
  GroupOption,
  GroupOptionValue,
  Overlap,
  SelectedGroups,
} from './types';
import { AGENT_GROUP_KEY } from './types';

// Component type constant for Osquery integration
const OSQUERY_COMPONENT_TYPE = 'osquery' as const;

// Minimal type definition for agent components - only what we need for Osquery
export interface AgentComponent {
  type: string;
  status?: FleetServerAgentComponentStatus;
}

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

  return (type: AGENT_GROUP_KEY): string => {
    if (!typeColors.has(type)) {
      typeColors.set(type, visColorsBehindText[typeColors.size]);
    }

    return typeColors.get(type)!;
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
 * Get the Osquery component status from an agent
 * @param agent - Agent object containing components array
 * @returns Component status (Fleet API returns uppercase: HEALTHY, DEGRADED, FAILED, STOPPED) or undefined if component not found
 */
const getOsqueryStatus = (agent: {
  components?: AgentComponent[];
}): FleetServerAgentComponentStatus | undefined => {
  if (!agent.components || agent.components.length === 0) {
    return undefined;
  }

  const osqueryComponent = agent.components.find(
    (component) => component.type === OSQUERY_COMPONENT_TYPE
  );

  return osqueryComponent?.status;
};

/**
 * Check if the Osquery component can process queries.
 * Returns true for HEALTHY or DEGRADED (both can process queries, though DEGRADED may have issues).
 * Returns false for FAILED, STOPPED, or missing component.
 *
 * SECURITY NOTE: Component status is validated by Fleet server based on agent check-ins
 * and integration health checks. This data is trusted as it comes from the Fleet API.
 *
 * @param agent - Agent object containing components array
 * @returns true if Osquery can process queries, false otherwise
 */
export const isOsqueryComponentHealthy = (agent: { components?: AgentComponent[] }): boolean => {
  const status = getOsqueryStatus(agent);

  return status === 'HEALTHY' || status === 'DEGRADED';
};

/**
 * Determine agent availability status for Osquery queries
 *
 * Decision Tree:
 * 1. Agent offline? → 'offline'
 * 2. Osquery missing/FAILED/STOPPED? → 'osquery_unavailable'
 * 3. BOTH agent degraded AND Osquery DEGRADED? → 'osquery_unavailable' (too unreliable)
 * 4. Agent online AND Osquery HEALTHY? → 'online'
 * 5. Single degradation? → 'degraded'
 *
 * Examples:
 * | Agent Status | Osquery Status | Result                  | Selectable | Description              |
 * |--------------|----------------|-------------------------|------------|--------------------------|
 * | online       | HEALTHY        | online                  | ✅ Yes     | Fully operational        |
 * | degraded     | HEALTHY        | degraded                | ⚠️ Yes     | Queries work fine        |
 * | online       | DEGRADED       | degraded                | ⚠️ Yes     | Queries work with issues |
 * | degraded     | DEGRADED       | osquery_unavailable     | ❌ No      | Too unreliable           |
 * | offline      | *              | offline                 | ❌ No      | Not reachable            |
 * | *            | FAILED/STOPPED | osquery_unavailable     | ❌ No      | Osquery won't work       |
 *
 * @param agent - Agent object with status and components from Fleet API
 */
export const getAgentOsqueryAvailability = (agent: {
  status?: string;
  components?: AgentComponent[];
  last_checkin?: string;
}): 'online' | 'degraded' | 'osquery_unavailable' | 'offline' => {
  if (agent.status === 'offline') {
    return 'offline';
  }

  const osqueryStatus = getOsqueryStatus(agent);

  if (!osqueryStatus || osqueryStatus === 'FAILED' || osqueryStatus === 'STOPPED') {
    return 'osquery_unavailable';
  }

  if (agent.status === 'degraded' && osqueryStatus === 'DEGRADED') {
    return 'osquery_unavailable';
  }

  if (agent.status === 'online' && osqueryStatus === 'HEALTHY') {
    return 'online';
  }

  // Explicitly handle all "partially degraded but usable" scenarios
  if (
    (agent.status === 'online' || agent.status === 'degraded' || !agent.status) &&
    (osqueryStatus === 'HEALTHY' || osqueryStatus === 'DEGRADED')
  ) {
    return 'degraded';
  }

  // Safety fallback: any other combination should be unavailable
  return 'osquery_unavailable';
};
