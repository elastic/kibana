/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash/fp';

import { formatIndexFields } from './elasticsearch_adapter';
import { mockAuditbeatIndexField, mockFilebeatIndexField, mockPacketbeatIndexField } from './mock';

describe('Index Fields', () => {
  describe('formatIndexFields', () => {
    test('Test Basic functionality', async () => {
      expect(
        sortBy(
          'name',
          formatIndexFields(
            [mockAuditbeatIndexField, mockFilebeatIndexField, mockPacketbeatIndexField],
            ['auditbeat', 'filebeat', 'packetbeat']
          )
        )
      ).toEqual(
        sortBy('name', [
          {
            aggregatable: true,
            category: 'base',
            description:
              'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
            example: '2016-05-23T08:05:34.853Z',
            indexes: ['auditbeat', 'filebeat', 'packetbeat'],
            name: '@timestamp',
            searchable: true,
            type: 'date',
          },
          {
            aggregatable: true,
            category: 'agent',
            description:
              'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
            example: '8a4f500f',
            indexes: ['auditbeat'],
            name: 'agent.ephemeral_id',
            searchable: true,
            type: 'string',
          },
          {
            aggregatable: true,
            category: 'agent',
            indexes: ['filebeat'],
            name: 'agent.hostname',
            searchable: true,
            type: 'string',
          },
          {
            aggregatable: true,
            category: 'agent',
            description:
              'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
            example: '8a4f500d',
            indexes: ['packetbeat'],
            name: 'agent.id',
            searchable: true,
            type: 'string',
          },
          {
            aggregatable: true,
            category: 'agent',
            description:
              'Name of the agent. This is a name that can be given to an agent. This can be helpful if for example two Filebeat instances are running on the same host but a human readable separation is needed on which Filebeat instance data is coming from. If no name is given, the name is often left empty.',
            example: 'foo',
            indexes: ['auditbeat', 'filebeat'],
            name: 'agent.name',
            searchable: true,
            type: 'string',
          },
          {
            aggregatable: true,
            category: 'agent',
            description:
              'Type of the agent. The agent type stays always the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
            example: 'filebeat',
            indexes: ['auditbeat', 'packetbeat'],
            name: 'agent.type',
            searchable: true,
            type: 'string',
          },
          {
            aggregatable: true,
            category: 'agent',
            description: 'Version of the agent.',
            example: '6.0.0-rc2',
            indexes: ['auditbeat', 'filebeat'],
            name: 'agent.version',
            searchable: true,
            type: 'string',
          },
        ])
      );
    });
  });
});
