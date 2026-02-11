/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { FleetServerAgentComponentStatus } from '@kbn/fleet-plugin/common';
import { generateGroupOption } from './agent_grouper';
import {
  getNumOverlapped,
  getNumAgentsInGrouping,
  generateAgentSelection,
  isOsqueryComponentHealthy,
  getAgentOsqueryAvailability,
  type AgentComponent,
} from './helpers';
import type { GroupOption, Overlap, SelectedGroups } from './types';
import { AGENT_GROUP_KEY } from './types';
import { processAggregations } from '../../common/utils/aggregations';

// Test helper to create properly typed component objects
const createComponent = (
  type: string,
  status: FleetServerAgentComponentStatus
): AgentComponent => ({
  type,
  status,
});

describe('generateAgentSelection', () => {
  it('should handle empty input', () => {
    const options: GroupOption[] = [];
    const { newAgentSelection, selectedGroups, selectedAgents } = generateAgentSelection(options);
    expect(newAgentSelection).toEqual({
      agents: [],
      allAgentsSelected: false,
      offlineAgentsSelected: false,
      platformsSelected: [],
      policiesSelected: [],
    });
    expect(selectedAgents).toEqual([]);
    expect(selectedGroups).toEqual({
      policy: {},
      platform: {},
    });
  });

  it('should properly pull out group ids', () => {
    const options: GroupOption[] = [];
    const policyOptions = generateGroupOption('policy', AGENT_GROUP_KEY.Policy, [
      { name: 'policy 1', id: 'policy 1', size: 5 },
      { name: 'policy 2', id: uuidv4(), size: 5 },
    ]).options;
    options.push(...policyOptions);

    const platformOptions = generateGroupOption('platform', AGENT_GROUP_KEY.Platform, [
      { name: 'platform 1', id: 'platform 1', size: 5 },
      { name: 'platform 2', id: uuidv4(), size: 5 },
    ]).options;
    options.push(...platformOptions);

    const { newAgentSelection, selectedGroups, selectedAgents } = generateAgentSelection(options);
    expect(newAgentSelection).toEqual({
      agents: [],
      allAgentsSelected: false,
      offlineAgentsSelected: false,
      platformsSelected: platformOptions.map(({ value: { id } }) => id),
      policiesSelected: policyOptions.map(({ value: { id } }) => id),
    });
    expect(selectedAgents).toEqual([]);
    expect(Object.keys(selectedGroups.platform).length).toEqual(2);
    expect(Object.keys(selectedGroups.policy).length).toEqual(2);
  });
});

describe('processAggregations', () => {
  it('should handle empty inputs properly', () => {
    const input = {};
    const { platforms, policies, overlap } = processAggregations(input);
    expect(platforms).toEqual([]);
    expect(policies).toEqual([]);
    expect(overlap).toEqual({});
  });
  it('should handle platforms with no policies', () => {
    const input = {
      platforms: {
        buckets: [
          {
            key: 'darwin',
            doc_count: 200,
            policies: {
              buckets: [],
            },
          },
        ],
      },
    };
    const { platforms, policies, overlap } = processAggregations(input);
    expect(platforms).toEqual([
      {
        id: 'darwin',
        name: 'darwin',
        size: 200,
      },
    ]);
    expect(policies).toEqual([]);
    expect(overlap).toEqual({});
  });
  it('should handle policies with no platforms', () => {
    const input = {
      policies: {
        buckets: [
          {
            key: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
            doc_count: 100,
          },
          {
            key: '8cd06880-8a74-11eb-86cb-c58693443a4f',
            doc_count: 100,
          },
        ],
      },
    };
    const { platforms, policies, overlap } = processAggregations(input);
    expect(platforms).toEqual([]);
    expect(policies).toEqual([
      {
        id: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
        name: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
        size: 100,
      },
      {
        id: '8cd06880-8a74-11eb-86cb-c58693443a4f',
        name: '8cd06880-8a74-11eb-86cb-c58693443a4f',
        size: 100,
      },
    ]);
    expect(overlap).toEqual({});
  });
  it('should parse aggregation responses down into metadata objects', () => {
    const input = {
      policies: {
        buckets: [
          {
            key: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
            doc_count: 100,
          },
          {
            key: '8cd06880-8a74-11eb-86cb-c58693443a4f',
            doc_count: 100,
          },
        ],
      },
      platforms: {
        buckets: [
          {
            key: 'darwin',
            doc_count: 200,
            policies: {
              buckets: [
                {
                  key: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
                  doc_count: 100,
                },
                {
                  key: '8cd06880-8a74-11eb-86cb-c58693443a4f',
                  doc_count: 100,
                },
              ],
            },
          },
        ],
      },
    };
    const { platforms, policies, overlap } = processAggregations(input);
    expect(platforms).toEqual([
      {
        id: 'darwin',
        name: 'darwin',
        size: 200,
      },
    ]);
    expect(policies).toEqual([
      {
        id: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
        name: '8cd01a60-8a74-11eb-86cb-c58693443a4f',
        size: 100,
      },
      {
        id: '8cd06880-8a74-11eb-86cb-c58693443a4f',
        name: '8cd06880-8a74-11eb-86cb-c58693443a4f',
        size: 100,
      },
    ]);
    expect(overlap).toEqual({
      darwin: {
        '8cd06880-8a74-11eb-86cb-c58693443a4f': 100,
        '8cd01a60-8a74-11eb-86cb-c58693443a4f': 100,
      },
    });
  });
});

describe('getNumAgentsInGrouping', () => {
  it('should handle empty objects', () => {
    const selectedGroups: SelectedGroups = {};
    expect(getNumAgentsInGrouping(selectedGroups)).toEqual(0);
  });

  it('should add up the quantities for the selected groups', () => {
    const selectedGroups: SelectedGroups = {
      platform: {
        linux: 35,
      },
      policy: {
        policy_id1: 40,
      },
    };
    expect(getNumAgentsInGrouping(selectedGroups)).toEqual(75);
  });
});

describe('getNumOverlapped', () => {
  const overlap: Overlap = {
    darwin: {
      policy_id1: 15,
      policy_id2: 35,
    },
    linux: {
      policy_id1: 25,
      policy_id2: 10,
    },
  };

  it('should add up the quantities associated with a platform/policy selection', () => {
    const selectedGroups: SelectedGroups = {
      platform: {
        linux: 35,
      },
      policy: {
        policy_id1: 40,
      },
    };

    const computedOverlap = getNumOverlapped(selectedGroups, overlap);
    expect(computedOverlap).toBe(25);
  });

  it('should gracefully handle empty objects', () => {
    const selectedGroups: SelectedGroups = {};

    const computedOverlap = getNumOverlapped(selectedGroups, overlap);
    expect(computedOverlap).toBe(0);
  });

  it('should gracefully handle missing platforms', () => {
    const selectedGroups: SelectedGroups = {
      policy: {
        policy_id1: 40,
        policy_id3: 40,
      },
    };
    const computedOverlap = getNumOverlapped(selectedGroups, overlap);
    expect(computedOverlap).toBe(0);
  });

  it('should gracefully handle missing policies', () => {
    const selectedGroups: SelectedGroups = {
      platform: {
        linux: 35,
        windows: 40,
      },
    };
    const computedOverlap = getNumOverlapped(selectedGroups, overlap);
    expect(computedOverlap).toBe(0);
  });

  it('should gracefully handle missing group selections', () => {
    const selectedGroups: SelectedGroups = {
      platform: {
        linux: 35,
        windows: 40,
      },
      policy: {
        policy_id1: 40,
        policy_id3: 40,
      },
    };

    const computedOverlap = getNumOverlapped(selectedGroups, overlap);
    expect(computedOverlap).toBe(25);
  });
});

describe('isOsqueryComponentHealthy', () => {
  it('should return true for HEALTHY status', () => {
    const agent = {
      components: [createComponent('osquery', 'HEALTHY')],
    };
    expect(isOsqueryComponentHealthy(agent)).toBe(true);
  });

  it('should return true for DEGRADED status', () => {
    const agent = {
      components: [createComponent('osquery', 'DEGRADED')],
    };
    expect(isOsqueryComponentHealthy(agent)).toBe(true);
  });

  it('should return false for FAILED status', () => {
    const agent = {
      components: [createComponent('osquery', 'FAILED')],
    };
    expect(isOsqueryComponentHealthy(agent)).toBe(false);
  });

  it('should return false for STOPPED status', () => {
    const agent = {
      components: [createComponent('osquery', 'STOPPED')],
    };
    expect(isOsqueryComponentHealthy(agent)).toBe(false);
  });

  it('should return false when components array is empty', () => {
    const agent = { components: [] };
    expect(isOsqueryComponentHealthy(agent)).toBe(false);
  });

  it('should return false when components is undefined', () => {
    const agent = {};
    expect(isOsqueryComponentHealthy(agent)).toBe(false);
  });

  it('should return false when osquery component is not found', () => {
    const agent = {
      components: [createComponent('filebeat', 'HEALTHY')],
    };
    expect(isOsqueryComponentHealthy(agent)).toBe(false);
  });

  it('should handle multiple components and find osquery', () => {
    const agent = {
      components: [
        createComponent('filebeat', 'HEALTHY'),
        createComponent('osquery', 'DEGRADED'),
        createComponent('endpoint', 'FAILED'),
      ],
    };
    expect(isOsqueryComponentHealthy(agent)).toBe(true);
  });
});

describe('getAgentOsqueryAvailability', () => {
  it('should return "online" for healthy agent with healthy Osquery', () => {
    const agent = {
      status: 'online',
      last_checkin: '2025-10-16T11:59:00Z',
      components: [createComponent('osquery', 'HEALTHY')],
    };
    expect(getAgentOsqueryAvailability(agent)).toBe('online');
  });

  it('should return "degraded" for degraded agent with healthy Osquery', () => {
    const agent = {
      status: 'degraded',
      last_checkin: '2025-10-16T11:59:00Z',
      components: [createComponent('osquery', 'HEALTHY')],
    };
    expect(getAgentOsqueryAvailability(agent)).toBe('degraded');
  });

  it('should return "osquery_unavailable" for online agent with failed Osquery', () => {
    const agent = {
      status: 'online',
      last_checkin: '2025-10-16T11:59:00Z',
      components: [createComponent('osquery', 'FAILED')],
    };
    expect(getAgentOsqueryAvailability(agent)).toBe('osquery_unavailable');
  });

  it('should return "offline" when status is offline', () => {
    const agent = {
      status: 'offline',
      last_checkin: '2025-10-16T11:59:00Z',
      components: [createComponent('osquery', 'HEALTHY')],
    };
    expect(getAgentOsqueryAvailability(agent)).toBe('offline');
  });

  it('should return "offline" when status is offline even with recent check-in', () => {
    const agent = {
      status: 'offline',
      last_checkin: new Date().toISOString(), // Now
      components: [createComponent('osquery', 'HEALTHY')],
    };
    expect(getAgentOsqueryAvailability(agent)).toBe('offline');
  });

  it('should return "osquery_unavailable" when BOTH agent AND Osquery are DEGRADED (double degradation)', () => {
    const agent = {
      status: 'degraded',
      last_checkin: '2025-10-16T11:59:00Z',
      components: [createComponent('osquery', 'DEGRADED')],
    };
    // When both are degraded, it's too unreliable - treat as unavailable
    expect(getAgentOsqueryAvailability(agent)).toBe('osquery_unavailable');
  });

  it('should return "osquery_unavailable" for degraded agent with failed Osquery', () => {
    const agent = {
      status: 'degraded',
      last_checkin: '2025-10-16T11:59:00Z',
      components: [createComponent('osquery', 'FAILED')],
    };
    expect(getAgentOsqueryAvailability(agent)).toBe('osquery_unavailable');
  });

  it('should return "osquery_unavailable" when agent has no components', () => {
    const agent = {
      status: 'online',
      last_checkin: '2025-10-16T11:59:00Z',
      components: [],
    };
    expect(getAgentOsqueryAvailability(agent)).toBe('osquery_unavailable');
  });

  it('should return "osquery_unavailable" when components is undefined', () => {
    const agent = {
      status: 'online',
      last_checkin: '2025-10-16T11:59:00Z',
    };
    expect(getAgentOsqueryAvailability(agent)).toBe('osquery_unavailable');
  });

  it('should handle agent with status undefined as not offline', () => {
    const agent = {
      last_checkin: '2025-10-16T11:59:00Z',
      components: [createComponent('osquery', 'HEALTHY')],
    };
    // Status not online but not offline either, so it's degraded
    expect(getAgentOsqueryAvailability(agent)).toBe('degraded');
  });

  it('should return "degraded" for online agent with DEGRADED Osquery (single degradation)', () => {
    const agent = {
      status: 'online',
      last_checkin: '2025-10-16T11:59:00Z',
      components: [createComponent('osquery', 'DEGRADED')],
    };
    // Agent is checking in fine, just Osquery is degraded - queries should still work
    expect(getAgentOsqueryAvailability(agent)).toBe('degraded');
  });
});
