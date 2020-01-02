/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { SavedObject } from 'src/core/server';
import { AgentEventsRepository } from './default';
import { SODatabaseAdapter as SODatabaseAdapterType } from '../../adapters/saved_objects_database/adapter_types';
import { SODatabaseAdapter } from '../../adapters/saved_objects_database/default';
import { MemorizeSODatabaseAdapter } from '../../adapters/saved_objects_database/memorize_adapter';
import { FrameworkUser, internalAuthData } from '../../adapters/framework/adapter_types';
import { AgentEvent } from '../../../common/types/domain_data';

describe('AgentsEventsRepository', () => {
  let repository: AgentEventsRepository;
  let soAdapter: SODatabaseAdapterType;
  let servers: any;

  function getUser(): FrameworkUser {
    return ({
      kind: 'authenticated',
      [internalAuthData]: {
        headers: {
          authorization: `Basic ${Buffer.from(`elastic:changeme`).toString('base64')}`,
        },
      },
    } as unknown) as FrameworkUser;
  }

  async function loadFixtures(agentId: string, events: AgentEvent[]): Promise<SavedObject[]> {
    const res: SavedObject[] = [];
    for (const event of events) {
      res.push(
        await soAdapter.create(getUser(), 'agent_events', {
          ...event,
          agent_id: agentId,
        })
      );
    }

    return res;
  }

  async function clearFixtures() {
    const request = getUser();
    const { saved_objects: savedObjects } = await soAdapter.find(request, {
      type: 'agent_events',
      perPage: 1000,
    });
    for (const so of savedObjects) {
      await soAdapter.delete(request, 'agent_events', so.id);
    }
  }

  beforeAll(async () => {
    await Slapshot.callWhenOnline(async () => {
      const { createKibanaServer } = await import(
        '../../../../../../test_utils/jest/contract_tests/servers'
      );
      servers = await createKibanaServer({
        security: { enabled: false },
      });
      const baseAdapter = new SODatabaseAdapter(
        servers.kbnServer.savedObjects,
        servers.kbnServer.plugins.elasticsearch
      );
      soAdapter = new MemorizeSODatabaseAdapter(baseAdapter);
    });

    if (!soAdapter) {
      soAdapter = new MemorizeSODatabaseAdapter();
    }
    repository = new AgentEventsRepository(soAdapter);
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown;
    }
  });

  afterEach(clearFixtures);

  describe('createEventsForAgent', () => {
    beforeEach(async () => {
      await loadFixtures('agent:1', [
        {
          type: 'STATE',
          subtype: 'STARTING',
          timestamp: '2019-09-27T18:50:32+0000',
          message: '...',
        },
      ]);
    });

    it('Create events for an agent', async () => {
      await repository.createEventsForAgent(getUser(), 'agent:1', [
        {
          type: 'STATE',
          subtype: 'STARTING',
          timestamp: '2019-09-27T18:50:33+0000',
          message: '...',
        },
        {
          type: 'STATE',
          subtype: 'STARTING',
          timestamp: '2019-09-27T18:50:34+0000',
          message: '...',
        },
      ]);

      const events = await soAdapter.find(getUser(), {
        type: 'agent_events',
      });

      const agent1Events = events.saved_objects.filter(o => o.attributes.agent_id === 'agent:1');
      expect(agent1Events).toHaveLength(3);
      expect(
        agent1Events.find(e => e.attributes.timestamp === '2019-09-27T18:50:34+0000')
      ).toBeDefined();
      expect(
        agent1Events.find(e => e.attributes.timestamp === '2019-09-27T18:50:33+0000')
      ).toBeDefined();
    });
  });

  describe('deleteEventsForAgent', () => {
    beforeEach(async () => {
      await loadFixtures('agent:1', [
        {
          type: 'STATE',
          subtype: 'STARTING',
          timestamp: '2019-09-27T18:50:32+0000',
          message: '...',
        },
        {
          type: 'STATE',
          subtype: 'STARTING',
          timestamp: '2019-09-27T18:50:33+0000',
          message: '...',
        },
        {
          type: 'STATE',
          subtype: 'STARTING',
          timestamp: '2019-09-27T18:50:34+0000',
          message: '...',
        },
      ]);
      await loadFixtures('agent:2', [
        {
          type: 'STATE',
          subtype: 'STARTING',
          timestamp: '2019-09-27T18:50:32+0000',
          message: '...',
        },
      ]);
    });

    it('Delete correctly all events for the agent', async () => {
      await repository.deleteEventsForAgent(getUser(), 'agent:1');

      const events = await soAdapter.find(getUser(), {
        type: 'agent_events',
      });

      const agent1Events = events.saved_objects.filter(o => o.attributes.agent_id === 'agent:1');
      const agent2Events = events.saved_objects.filter(o => o.attributes.agent_id === 'agent:2');

      expect(agent1Events).toHaveLength(0);
      expect(agent2Events).toHaveLength(1);
    });
  });

  describe('getEventsForAgent', () => {
    beforeEach(async () => {
      await loadFixtures('agent:1', [
        {
          type: 'STATE',
          subtype: 'STARTING',
          timestamp: '2019-09-27T18:50:32+0000',
          message: '...',
          payload: '{"previous_state": "STOPPED"}',
          data: '{serializedDATA}',
        },
        {
          type: 'STATE',
          subtype: 'STOPPED',
          timestamp: '2019-09-27T18:50:33+0000',
          message: '...',
        },
        {
          type: 'STATE',
          subtype: 'STARTING',
          timestamp: '2019-09-27T18:50:34+0000',
          message: '...',
        },
      ]);
      await loadFixtures('agent:2', [
        {
          type: 'STATE',
          subtype: 'STARTING',
          timestamp: '2019-09-27T18:50:32+0000',
          message: '...',
        },
      ]);
    });

    it('Get events for the agent', async () => {
      const { items, total } = await repository.getEventsForAgent(getUser(), 'agent:1');

      expect(total).toBe(3);
      expect(items).toHaveLength(3);

      const itemWithPayload = items.find(i => i.timestamp === '2019-09-27T18:50:32+0000');
      expect(itemWithPayload).toBeDefined();

      expect((itemWithPayload as AgentEvent).payload).toMatchObject({
        previous_state: 'STOPPED',
      });
    });

    it('allow to filter using KQL', async () => {
      const { items, total } = await repository.getEventsForAgent(getUser(), 'agent:1', {
        search: 'agent_events.subtype:STOPPED',
      });

      expect(total).toBe(1);
      expect(items).toHaveLength(1);

      expect(items[0].subtype).toBe('STOPPED');
    });
  });
});
