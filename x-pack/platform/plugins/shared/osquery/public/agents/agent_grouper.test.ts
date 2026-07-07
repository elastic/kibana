/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetServerAgentComponentStatus, AgentStatus } from '@kbn/fleet-plugin/common';
import type { FleetServerAgentComponent } from '@kbn/fleet-plugin/common/types/models/agent';
import { AgentGrouper, generateAgentOption } from './agent_grouper';
import type { Group, GroupedAgent, GroupOptionValue } from './types';
import { AGENT_GROUP_KEY, AGENT_STATUS_COLORS } from './types';
import { v4 as uuidv4 } from 'uuid';
import { ALL_AGENTS_LABEL, AGENT_SELECTION_LABEL } from './translations';

type GroupData = {
  [key in Exclude<AGENT_GROUP_KEY, AGENT_GROUP_KEY.All | AGENT_GROUP_KEY.Agent>]: Group[];
};
export function genGroup(name: string) {
  return {
    name,
    id: uuidv4(),
    size: 5,
  };
}

export function genAgent(
  policyId: string,
  hostname: string,
  id: string,
  status: AgentStatus = 'online',
  components?: FleetServerAgentComponent[]
): GroupedAgent {
  return {
    status,
    policy_id: policyId,
    components,
    local_metadata: {
      elastic: {
        agent: {
          id,
        },
      },
      os: {
        platform: 'test platform',
      },
      host: {
        hostname,
      },
    },
  };
}

// Helper to create component with proper typing
function createComponent(
  type: string,
  status: FleetServerAgentComponentStatus
): FleetServerAgentComponent {
  return {
    id: uuidv4(),
    type,
    status,
    message: 'Test component',
  };
}

export const groupData: GroupData = {
  [AGENT_GROUP_KEY.Platform]: new Array(3).fill('test platform ').map((el, i) => genGroup(el + i)),
  [AGENT_GROUP_KEY.Policy]: new Array(3).fill('test policy ').map((el, i) => genGroup(el + i)),
};

describe('AgentGrouper', () => {
  describe('All agents', () => {
    it('should handle empty groups properly', () => {
      const agentGrouper = new AgentGrouper();
      expect(agentGrouper.generateOptions()).toEqual([]);
    });

    it('should ignore calls to add things to the "all" group', () => {
      const agentGrouper = new AgentGrouper();
      agentGrouper.updateGroup(AGENT_GROUP_KEY.All, [{}]);
      expect(agentGrouper.generateOptions()).toEqual([]);
    });

    it('should omit the "all agents" option when total is set to <= 0', () => {
      const agentGrouper = new AgentGrouper();
      agentGrouper.setTotalAgents(0);
      expect(agentGrouper.generateOptions()).toEqual([]);
      agentGrouper.setTotalAgents(-1);
      expect(agentGrouper.generateOptions()).toEqual([]);
    });

    it('should add the "all agents" option when the total is set to > 0', () => {
      const agentGrouper = new AgentGrouper();
      agentGrouper.setTotalAgents(100);
      const groups = agentGrouper.generateOptions();

      const allGroup = groups[AGENT_GROUP_KEY.All].options![0];
      expect(allGroup.label).toEqual(ALL_AGENTS_LABEL);
      const size: number = (allGroup.value as GroupOptionValue).size;

      expect(size).toEqual(100);
      agentGrouper.setTotalAgents(0);
      expect(agentGrouper.generateOptions()).toEqual([]);
    });
  });

  describe('Policies and platforms', () => {
    function genGroupTest(
      key: AGENT_GROUP_KEY.Platform | AGENT_GROUP_KEY.Policy,
      dataName: string
    ) {
      return () => {
        const agentGrouper = new AgentGrouper();
        const data = groupData[key];
        agentGrouper.updateGroup(key, data);

        const groups = agentGrouper.generateOptions();
        const options = groups[0].options;
        expect(options).toBeTruthy();

        data.forEach((datum, i) => {
          const opt = options![i];
          expect(opt.label).toEqual(`test ${dataName} ${i} (${datum.id})`);
          expect(opt.key).toEqual(datum.id);
          expect(opt.value).toEqual({
            groupType: key,
            id: datum.id,
            size: 5,
          });
        });
      };
    }

    it('should generate policy options', genGroupTest(AGENT_GROUP_KEY.Policy, 'policy'));
    it('should generate platform options', genGroupTest(AGENT_GROUP_KEY.Platform, 'platform'));
  });

  describe('agents', () => {
    it('should generate agent options', () => {
      const agentGrouper = new AgentGrouper();
      const policyId = uuidv4();
      const agentData: GroupedAgent[] = [
        genAgent(policyId, `agent host 1`, uuidv4()),
        genAgent(policyId, `agent host 2`, uuidv4()),
      ];
      agentGrouper.updateGroup(AGENT_GROUP_KEY.Agent, agentData);

      const groups = agentGrouper.generateOptions();
      const options = groups[0].options;
      expect(options).toBeTruthy();
      agentData.forEach((ag, i) => {
        const opt = options![i];
        expect(opt.label).toEqual(
          `${ag.local_metadata.host.hostname} (${ag.local_metadata.elastic.agent.id})`
        );
        expect(opt.key).toEqual(ag.local_metadata.elastic.agent.id);
        expect(opt.value?.id).toEqual(ag.local_metadata.elastic.agent.id);
      });
    });
  });

  describe('generateAgentOption - agent availability', () => {
    const policyId = uuidv4();

    it('should mark online agents with healthy Osquery as enabled with normal color', () => {
      const agentData: GroupedAgent[] = [
        genAgent(policyId, 'online-agent', uuidv4(), 'online', [
          createComponent('osquery', 'HEALTHY'),
        ]),
      ];

      const result = generateAgentOption(AGENT_SELECTION_LABEL, AGENT_GROUP_KEY.Agent, agentData);
      const option = result.options[0];

      expect(option.disabled).toBe(false);
      expect(option.color).not.toBe(AGENT_STATUS_COLORS.DEGRADED);
      expect(option.color).not.toBe(AGENT_STATUS_COLORS.UNAVAILABLE);
    });

    it('should mark degraded agents with healthy Osquery as enabled with warning color', () => {
      const agentData: GroupedAgent[] = [
        genAgent(policyId, 'degraded-agent', uuidv4(), 'degraded', [
          createComponent('osquery', 'HEALTHY'),
        ]),
      ];

      const result = generateAgentOption(AGENT_SELECTION_LABEL, AGENT_GROUP_KEY.Agent, agentData);
      const option = result.options[0];

      expect(option.disabled).toBe(false); // Still selectable
      expect(option.color).toBe(AGENT_STATUS_COLORS.DEGRADED); // Orange
    });

    it('should mark offline agents as disabled with danger color', () => {
      const agentData: GroupedAgent[] = [
        genAgent(policyId, 'offline-agent', uuidv4(), 'offline', [
          createComponent('osquery', 'HEALTHY'),
        ]),
      ];

      const result = generateAgentOption(AGENT_SELECTION_LABEL, AGENT_GROUP_KEY.Agent, agentData);
      const option = result.options[0];

      expect(option.disabled).toBe(true); // Not selectable
      expect(option.color).toBe(AGENT_STATUS_COLORS.UNAVAILABLE); // Red
    });

    it('should mark agents with failed Osquery as disabled with danger color', () => {
      const agentData: GroupedAgent[] = [
        genAgent(policyId, 'osquery-failed-agent', uuidv4(), 'online', [
          createComponent('osquery', 'FAILED'),
        ]),
      ];

      const result = generateAgentOption(AGENT_SELECTION_LABEL, AGENT_GROUP_KEY.Agent, agentData);
      const option = result.options[0];

      expect(option.disabled).toBe(true); // Not selectable - Osquery won't work
      expect(option.color).toBe(AGENT_STATUS_COLORS.UNAVAILABLE); // Red
    });

    it('should mark agents without Osquery component as disabled', () => {
      const agentData: GroupedAgent[] = [
        genAgent(policyId, 'no-osquery-agent', uuidv4(), 'online', [
          createComponent('filebeat', 'HEALTHY'),
        ]),
      ];

      const result = generateAgentOption(AGENT_SELECTION_LABEL, AGENT_GROUP_KEY.Agent, agentData);
      const option = result.options[0];

      expect(option.disabled).toBe(true); // Not selectable - no Osquery
      expect(option.color).toBe(AGENT_STATUS_COLORS.UNAVAILABLE); // Red
    });

    it('should mark agents without components as disabled', () => {
      const agentData: GroupedAgent[] = [genAgent(policyId, 'no-components-agent', uuidv4())];

      const result = generateAgentOption(AGENT_SELECTION_LABEL, AGENT_GROUP_KEY.Agent, agentData);
      const option = result.options[0];

      expect(option.disabled).toBe(true); // Not selectable - no components
      expect(option.color).toBe(AGENT_STATUS_COLORS.UNAVAILABLE); // Red
    });

    it('should mark agents with BOTH agent AND Osquery DEGRADED as disabled (double degradation)', () => {
      const agentData: GroupedAgent[] = [
        genAgent(policyId, 'degraded-both', uuidv4(), 'degraded', [
          createComponent('osquery', 'DEGRADED'),
        ]),
      ];

      const result = generateAgentOption(AGENT_SELECTION_LABEL, AGENT_GROUP_KEY.Agent, agentData);
      const option = result.options[0];

      expect(option.disabled).toBe(true); // Not selectable - both degraded is too unreliable
      expect(option.color).toBe(AGENT_STATUS_COLORS.UNAVAILABLE); // Red
    });

    it('should mark online agent with DEGRADED Osquery as enabled with warning color', () => {
      const agentData: GroupedAgent[] = [
        genAgent(policyId, 'osquery-degraded', uuidv4(), 'online', [
          createComponent('osquery', 'DEGRADED'),
        ]),
      ];

      const result = generateAgentOption(AGENT_SELECTION_LABEL, AGENT_GROUP_KEY.Agent, agentData);
      const option = result.options[0];

      expect(option.disabled).toBe(false); // Still selectable - only Osquery degraded
      expect(option.color).toBe(AGENT_STATUS_COLORS.DEGRADED); // Orange
    });

    it('should handle multiple agents with different statuses correctly', () => {
      const agentData: GroupedAgent[] = [
        genAgent(policyId, 'online-agent', uuidv4(), 'online', [
          createComponent('osquery', 'HEALTHY'),
        ]),
        genAgent(policyId, 'degraded-agent', uuidv4(), 'degraded', [
          createComponent('osquery', 'HEALTHY'),
        ]),
        genAgent(policyId, 'offline-agent', uuidv4(), 'offline', [
          createComponent('osquery', 'HEALTHY'),
        ]),
        genAgent(policyId, 'failed-osquery', uuidv4(), 'online', [
          createComponent('osquery', 'FAILED'),
        ]),
        genAgent(policyId, 'double-degraded', uuidv4(), 'degraded', [
          createComponent('osquery', 'DEGRADED'),
        ]),
        genAgent(policyId, 'online-osquery-degraded', uuidv4(), 'online', [
          createComponent('osquery', 'DEGRADED'),
        ]),
      ];

      const result = generateAgentOption(AGENT_SELECTION_LABEL, AGENT_GROUP_KEY.Agent, agentData);
      const options = result.options;

      // Online with healthy Osquery - enabled
      expect(options[0].disabled).toBe(false);
      expect(options[0].color).not.toBe(AGENT_STATUS_COLORS.UNAVAILABLE);

      // Degraded agent with healthy Osquery - enabled, warning color
      expect(options[1].disabled).toBe(false);
      expect(options[1].color).toBe(AGENT_STATUS_COLORS.DEGRADED);

      // Offline - disabled, danger color
      expect(options[2].disabled).toBe(true);
      expect(options[2].color).toBe(AGENT_STATUS_COLORS.UNAVAILABLE);

      // Failed Osquery - disabled, danger color
      expect(options[3].disabled).toBe(true);
      expect(options[3].color).toBe(AGENT_STATUS_COLORS.UNAVAILABLE);

      // Both degraded - disabled, danger color
      expect(options[4].disabled).toBe(true);
      expect(options[4].color).toBe(AGENT_STATUS_COLORS.UNAVAILABLE);

      // Online agent with degraded Osquery - enabled, warning color
      expect(options[5].disabled).toBe(false);
      expect(options[5].color).toBe(AGENT_STATUS_COLORS.DEGRADED);
    });
  });
});
