/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addGeneratedActionValues } from './add_generated_action_values';
import type { RuleAction, RuleSystemAction } from '../../../common';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { getRulesClientMockParams } from '../../test_utils';

jest.mock('uuid', () => ({
  v4: () => '111-222',
}));

describe('addGeneratedActionValues()', () => {
  const uiSettings = uiSettingsServiceMock.createStartContract();
  const uiSettingsClient = uiSettingsServiceMock.createClient();

  uiSettings.asScopedToClient.mockReturnValue(uiSettingsClient);

  const { rulesClientParams } = getRulesClientMockParams({ uiSettings });

  const mockAction: RuleAction = {
    id: '1',
    group: 'default',
    actionTypeId: 'slack',
    params: {},
    frequency: {
      summary: false,
      notifyWhen: 'onActiveAlert',
      throttle: null,
    },
    alertsFilter: {
      query: {
        kql: 'test:testValue',
        filters: [
          {
            meta: { key: 'foo', params: { query: 'bar' } },
            query: { match_phrase: { foo: 'bar ' } },
          },
        ],
      },
      timeframe: {
        days: [1, 2],
        hours: { start: '08:00', end: '17:00' },
        timezone: 'UTC',
      },
    },
  };

  const mockSystemAction: RuleSystemAction = {
    id: '1',
    actionTypeId: 'slack',
    params: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('adds uuid', async () => {
    const actionWithGeneratedValues = await addGeneratedActionValues(
      [mockAction],
      [mockSystemAction],
      {
        ...rulesClientParams,
        minimumScheduleIntervalInMs: 0,
      }
    );

    expect(actionWithGeneratedValues.actions[0].uuid).toBe('111-222');

    expect(actionWithGeneratedValues.systemActions[0]).toEqual({
      actionTypeId: 'slack',
      id: '1',
      params: {},
      uuid: '111-222',
    });
  });

  test('adds DSL', async () => {
    const actionWithGeneratedValues = await addGeneratedActionValues(
      [mockAction],
      [mockSystemAction],
      {
        ...rulesClientParams,
        minimumScheduleIntervalInMs: 0,
      }
    );

    expect(actionWithGeneratedValues.actions[0].alertsFilter?.query?.dsl).toBe(
      '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"test":"testValue"}}],"minimum_should_match":1}},{"match_phrase":{"foo":"bar "}}],"should":[],"must_not":[]}}'
    );

    expect(actionWithGeneratedValues.systemActions[0]).toEqual({
      actionTypeId: 'slack',
      id: '1',
      params: {},
      uuid: '111-222',
    });

    expect(uiSettingsClient.get).toHaveBeenCalledTimes(3);
    expect(uiSettingsClient.get.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "query:allowLeadingWildcards",
        ],
        Array [
          "query:queryString:options",
        ],
        Array [
          "courier:ignoreFilterIfFieldNotInIndex",
        ],
      ]
    `);
  });

  test('throws error if KQL is not valid', async () => {
    await expect(async () =>
      addGeneratedActionValues(
        [
          {
            ...mockAction,
            alertsFilter: { query: { kql: 'foo:bar:1', filters: [] } },
          },
        ],

        [mockSystemAction],
        {
          ...rulesClientParams,
          minimumScheduleIntervalInMs: 0,
        }
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `
      "Invalid KQL: Expected AND, OR, end of input but \\":\\" found.
      foo:bar:1
      -------^"
    `
    );
  });
});
