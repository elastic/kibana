/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseRule } from './base_rule';

jest.mock('../static_globals', () => ({
  Globals: {
    app: {
      getLogger: () => ({ debug: jest.fn() }),
    },
  },
}));

describe('BaseRule', () => {
  describe('create', () => {
    it('should create a rule if it does not exist', async () => {
      const rule = new BaseRule();
      const rulesClient = {
        create: jest.fn(),
        find: jest.fn().mockImplementation(() => {
          return {
            total: 0,
          };
        }),
      };
      const actionsClient = {
        get: jest.fn().mockImplementation(() => {
          return {
            actionTypeId: 'foo',
          };
        }),
      };
      const actions = [
        {
          id: '1abc',
          config: {},
        },
      ];

      await rule.createIfDoesNotExist(rulesClient as any, actionsClient as any, actions);
      expect(rulesClient.create).toHaveBeenCalledWith({
        data: {
          actions: [
            {
              group: 'default',
              id: '1abc',
              params: {
                message: '{{context.internalShortMessage}}',
              },
              frequency: {
                summary: false,
                notifyWhen: 'onThrottleInterval',
                throttle: '1d',
              },
            },
          ],
          alertTypeId: '',
          consumer: 'monitoring',
          enabled: true,
          name: '',
          params: {
            duration: '1h',
            threshold: 85,
          },
          schedule: {
            interval: '1m',
          },
          tags: [],
        },
      });
    });

    it('should not create a rule if it exists', async () => {
      const rule = new BaseRule();
      const rulesClient = {
        create: jest.fn(),
        find: jest.fn().mockImplementation(() => {
          return {
            total: 1,
            data: [],
          };
        }),
      };
      const actionsClient = {
        get: jest.fn().mockImplementation(() => {
          return {
            actionTypeId: 'foo',
          };
        }),
      };
      const actions = [
        {
          id: '1abc',
          config: {},
        },
      ];

      await rule.createIfDoesNotExist(rulesClient as any, actionsClient as any, actions);
      expect(rulesClient.create).not.toHaveBeenCalled();
    });
  });

  describe('getStates', () => {
    it('should get alert states', async () => {
      const rulesClient = {
        getAlertState: jest.fn().mockImplementation(() => {
          return {
            alertInstances: {
              abc123: {
                id: 'foobar',
              },
            },
          };
        }),
      };
      const id = '456def';
      const filters: any[] = [];
      const rule = new BaseRule();
      const states = await rule.getStates(rulesClient as any, id, filters);
      expect(states).toStrictEqual({
        abc123: {
          id: 'foobar',
        },
      });
    });

    it('should return nothing if no states are available', async () => {
      const rulesClient = {
        getAlertState: jest.fn().mockImplementation(() => {
          return null;
        }),
      };
      const id = '456def';
      const filters: any[] = [];
      const rule = new BaseRule();
      const states = await rule.getStates(rulesClient as any, id, filters);
      expect(states).toStrictEqual({});
    });
  });
});
