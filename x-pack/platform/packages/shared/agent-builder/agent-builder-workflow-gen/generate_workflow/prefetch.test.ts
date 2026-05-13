/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorContractUnion } from '@kbn/workflows';
import { getAllConnectors } from '@kbn/workflows-management-plugin/common/schema';
import {
  prefetchConnectors,
  prefetchStepDefinitions,
  prefetchTriggerDefinitions,
} from './prefetch';

jest.mock('@kbn/workflows-management-plugin/common/schema', () => ({
  getAllConnectors: jest.fn().mockReturnValue([]),
}));

const getAllConnectorsMock = getAllConnectors as jest.MockedFunction<typeof getAllConnectors>;

const buildApi = (
  overrides: Partial<{
    getAvailableConnectors: jest.Mock;
  }> = {}
) =>
  ({
    getAvailableConnectors:
      overrides.getAvailableConnectors ??
      jest.fn().mockResolvedValue({ connectorTypes: {}, totalConnectors: 0 }),
  } as any);

beforeEach(() => {
  getAllConnectorsMock.mockReset();
  getAllConnectorsMock.mockReturnValue([]);
});

describe('prefetch helpers', () => {
  describe('prefetchConnectors', () => {
    it('returns compact summaries from a connectorTypes map with sub-actions', async () => {
      const api = buildApi({
        getAvailableConnectors: jest.fn().mockResolvedValue({
          connectorTypes: {
            '.slack': {
              instances: [{ id: 'slack-1', name: 'Eng Slack' }],
              subActions: [],
              enabled: true,
            },
            '.inference': {
              instances: [{ id: 'inf-1', name: 'GPT' }],
              subActions: [{ name: 'completion' }, { name: 'rerank' }],
              enabled: true,
            },
          },
          totalConnectors: 2,
        }),
      });

      const result = await prefetchConnectors({ api, spaceId: 'default', request: {} as any });

      expect(result).toEqual([
        { id: 'slack-1', name: 'Eng Slack', actionTypeId: '.slack', stepTypes: ['slack'] },
        {
          id: 'inf-1',
          name: 'GPT',
          actionTypeId: '.inference',
          stepTypes: ['inference.completion', 'inference.rerank'],
        },
      ]);
    });
  });

  describe('prefetchStepDefinitions', () => {
    it('returns id/label/description/category for built-ins and connector-derived steps', async () => {
      const result = await prefetchStepDefinitions({
        api: buildApi(),
        spaceId: 'default',
        request: {} as any,
      });

      expect(result.length).toBeGreaterThan(0);
      for (const def of result) {
        expect(def).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            label: expect.any(String),
            category: expect.any(String),
          })
        );
      }
    });

    it('excludes deprecated steps', async () => {
      const result = await prefetchStepDefinitions({
        api: buildApi(),
        spaceId: 'default',
        request: {} as any,
      });

      for (const def of result) {
        expect((def as any).deprecated).toBeFalsy();
      }
    });

    it('includes connector contracts returned by getAllConnectors (e.g. elasticsearch.request)', async () => {
      const esRequest = {
        type: 'elasticsearch.request',
        summary: 'Elasticsearch Request',
        description: 'Make a generic request to an Elasticsearch API',
        paramsSchema: {},
        outputSchema: {},
      } as unknown as ConnectorContractUnion;

      const customStep = {
        type: 'agent_builder.run_agent',
        summary: 'Run Agent',
        description: 'Invokes an Agent Builder agent.',
        paramsSchema: {},
        outputSchema: {},
      } as unknown as ConnectorContractUnion;

      getAllConnectorsMock.mockReturnValue([esRequest, customStep]);

      const result = await prefetchStepDefinitions({
        api: buildApi(),
        spaceId: 'default',
        request: {} as any,
      });

      const ids = result.map((d) => d.id);
      expect(ids).toContain('elasticsearch.request');
      expect(ids).toContain('agent_builder.run_agent');

      const entry = result.find((d) => d.id === 'elasticsearch.request');
      expect(entry).toEqual(
        expect.objectContaining({
          id: 'elasticsearch.request',
          label: 'Elasticsearch Request',
          category: 'elasticsearch',
        })
      );
    });
  });

  describe('prefetchTriggerDefinitions', () => {
    it('returns id/label/description for the built-in triggers', async () => {
      const result = await prefetchTriggerDefinitions();
      const ids = result.map((t) => t.id);
      expect(ids).toEqual(expect.arrayContaining(['manual', 'scheduled', 'alert']));
      for (const def of result) {
        expect(def).toEqual(
          expect.objectContaining({ id: expect.any(String), label: expect.any(String) })
        );
      }
    });
  });
});
