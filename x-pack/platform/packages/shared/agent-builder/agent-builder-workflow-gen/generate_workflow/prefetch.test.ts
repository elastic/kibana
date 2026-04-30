/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  prefetchConnectors,
  prefetchStepDefinitions,
  prefetchTriggerDefinitions,
} from './prefetch';

describe('prefetch helpers', () => {
  describe('prefetchConnectors', () => {
    it('returns compact summaries from a connectorTypes map with sub-actions', async () => {
      const api = {
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
      } as any;

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
        api: { getAvailableConnectors: jest.fn().mockResolvedValue({ connectorTypes: {} }) } as any,
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
        api: { getAvailableConnectors: jest.fn().mockResolvedValue({ connectorTypes: {} }) } as any,
        spaceId: 'default',
        request: {} as any,
      });

      for (const def of result) {
        expect((def as any).deprecated).toBeFalsy();
      }
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
