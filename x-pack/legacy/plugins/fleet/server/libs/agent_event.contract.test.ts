/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { FrameworkUser, internalAuthData } from '../adapters/framework/adapter_types';
import { MemorizeSODatabaseAdapter } from '../adapters/saved_objects_database/memorize_adapter';
import { SODatabaseAdapter } from '../adapters/saved_objects_database/default';
import { FleetServerLib } from './types';
import { compose } from './compose/memorized';
import { Agent } from '../repositories/agents/types';
import { AgentEvent } from '../../common/types/domain_data';

jest.mock('./framework');
jest.mock('./policy', () => ({
  PolicyLib: class PolicyLib {
    async getFullPolicy() {
      return {
        outputs: {
          default: {
            api_token: 'slfhsdlfhjjkshfkjh:sdfsdfsdfsdf',
            id: 'default',
            name: 'Default',
            type: 'elasticsearch',
            url: 'https://localhost:9200',
            tlsCert: 'ldsjfldsjfljsdalkfjl;ksadh;kjsdha;kjhslgkjhsdalkghasdkgh',
          },
        },
        streams: [
          {
            metricsets: ['container', 'cpu'],
            id: 'string',
            type: 'etc',
            output: {
              use_output: 'default',
            },
          },
        ],
      };
    }
  },
}));

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

describe('AgentEvent Lib', () => {
  let servers: any;
  let soAdapter: MemorizeSODatabaseAdapter;
  let libs: FleetServerLib;

  async function clearFixtures() {
    const { saved_objects: savedObjects } = await soAdapter.find(getUser(), {
      type: 'agent_events',
      perPage: 1000,
    });
    for (const so of savedObjects) {
      await soAdapter.delete(getUser(), 'agent_events', so.id);
    }
  }

  beforeAll(async () => {
    await Slapshot.callWhenOnline(async () => {
      const { createKibanaServer } = await import(
        '../../../../../test_utils/jest/contract_tests/servers'
      );
      servers = await createKibanaServer({
        security: { enabled: false },
      });
      soAdapter = new MemorizeSODatabaseAdapter(
        new SODatabaseAdapter(
          servers.kbnServer.savedObjects,
          servers.kbnServer.plugins.elasticsearch
        )
      );
    });

    if (!soAdapter) {
      soAdapter = new MemorizeSODatabaseAdapter();
    }
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown;
    }
  });
  beforeEach(async () => {
    await clearFixtures();
    libs = compose(servers ? servers.kbnServer : undefined);
  });

  describe('processEventsForCheckin', () => {
    it('Should do nothing if there is no events', async () => {
      const {
        updatedErrorEvents,
        acknowledgedActionIds,
      } = await libs.agentEvents.processEventsForCheckin(
        getUser(),
        { current_error_events: [] as AgentEvent[] } as Agent,
        []
      );

      expect(updatedErrorEvents).toHaveLength(0);
      expect(acknowledgedActionIds).toHaveLength(0);
    });

    it('Should clear error for a stream if there is a stream error event', async () => {
      const { updatedErrorEvents } = await libs.agentEvents.processEventsForCheckin(
        getUser(),
        {
          current_error_events: [
            {
              message: 'Invalid path /foo',
              type: 'ERROR',
              subtype: 'CONFIG',
              stream_id: 'stream-1',
              timestamp: '2019-11-07T18:43:46.773Z',
            },
            {
              message: 'Global error',
              type: 'ERROR',
              subtype: 'CONFIG',
              timestamp: '2019-11-07T18:43:46.773Z',
            },
          ] as AgentEvent[],
        } as Agent,
        [
          {
            message: 'Restarting',
            type: 'STATE',
            subtype: 'IN_PROGRESS',
            stream_id: 'stream-1',
            timestamp: '2019-11-07T18:43:46.773Z',
          },
        ]
      );

      expect(updatedErrorEvents).toHaveLength(1);
      expect(updatedErrorEvents[0]).toMatchObject({
        message: 'Global error',
      });
    });

    it('Should set error for a stream if there is a stream error event', async () => {
      const { updatedErrorEvents } = await libs.agentEvents.processEventsForCheckin(
        getUser(),
        { current_error_events: [] as AgentEvent[] } as Agent,
        [
          {
            message: 'Invalid path /foo',
            type: 'ERROR',
            subtype: 'CONFIG',
            stream_id: 'stream-1',
            timestamp: '2019-11-07T18:43:46.773Z',
          },
        ]
      );

      expect(updatedErrorEvents).toHaveLength(1);
      expect(updatedErrorEvents[0]).toMatchObject({
        message: 'Invalid path /foo',
        stream_id: 'stream-1',
      });
    });

    it('Should set error for a policy if there is a global error event', async () => {
      const { updatedErrorEvents } = await libs.agentEvents.processEventsForCheckin(
        getUser(),
        { current_error_events: [] as AgentEvent[] } as Agent,
        [
          {
            message: 'Invalid path /foo',
            type: 'ERROR',
            subtype: 'CONFIG',
            timestamp: '2019-11-07T18:43:46.773Z',
          },
        ]
      );

      expect(updatedErrorEvents).toHaveLength(1);
      expect(updatedErrorEvents[0]).toMatchObject({
        message: 'Invalid path /foo',
      });
    });
  });
});
