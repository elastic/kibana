/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { getConnectorSpec } from '@kbn/connector-specs';
import { getAgentConnectorDetail, listAgentConnectors } from './agent_connectors';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
  isToolAction: jest.fn(() => true),
}));

const getConnectorSpecMock = getConnectorSpec as jest.Mock;

const githubSpec = {
  metadata: { id: '.github', displayName: 'GitHub', description: 'Generic GitHub connector' },
  actions: {
    searchIssues: { description: 'Search issues', input: z.object({ query: z.string() }) },
  },
};

const connectors = [
  {
    id: 'gh-kibana',
    name: 'GitHub Kibana',
    actionTypeId: '.github',
    description: 'Use for the elastic/kibana repository.',
  },
  { id: 'gh-other', name: 'GitHub other', actionTypeId: '.github' },
];

const createActionsClient = () => ({
  getAll: jest.fn().mockResolvedValue(connectors),
  get: jest.fn(async ({ id }: { id: string }) => connectors.find((c) => c.id === id)!),
});

describe('agent connectors', () => {
  beforeEach(() => {
    getConnectorSpecMock.mockImplementation((actionTypeId: string) =>
      actionTypeId === '.github' ? githubSpec : undefined
    );
  });

  describe('listAgentConnectors', () => {
    it('returns the type description and the instance description when present', async () => {
      const result = await listAgentConnectors(createActionsClient(), {});

      expect(result).toEqual([
        {
          id: 'gh-kibana',
          name: 'GitHub Kibana',
          type: '.github',
          description: 'Generic GitHub connector',
          instanceDescription: 'Use for the elastic/kibana repository.',
        },
        {
          id: 'gh-other',
          name: 'GitHub other',
          type: '.github',
          description: 'Generic GitHub connector',
        },
      ]);
    });

    it('filters by allowed ids', async () => {
      const result = await listAgentConnectors(createActionsClient(), {
        allowedIds: ['gh-other'],
      });

      expect(result.map(({ id }) => id)).toEqual(['gh-other']);
    });
  });

  describe('getAgentConnectorDetail', () => {
    it('includes the instance description', async () => {
      const result = await getAgentConnectorDetail(createActionsClient(), 'gh-kibana');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'gh-kibana',
          description: 'Generic GitHub connector',
          instanceDescription: 'Use for the elastic/kibana repository.',
          subActions: [expect.objectContaining({ name: 'searchIssues' })],
        })
      );
    });
  });
});
