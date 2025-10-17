/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttackDiscoveryScheduleUpdatePropsFromApi } from '.';
import type { AttackDiscoveryApiScheduleUpdateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

describe('transformAttackDiscoveryScheduleUpdatePropsFromApi', () => {
  const mockApiUpdateProps: AttackDiscoveryApiScheduleUpdateProps = {
    name: 'Updated Test Schedule',
    params: {
      alerts_index_pattern: '.alerts-security.alerts-default',
      api_config: {
        name: 'Updated Test AI',
        connectorId: 'updated-connector',
        actionTypeId: '.bedrock',
        model: 'anthropic.claude-3-sonnet-20240229-v1:0',
        provider: 'Other',
      },
      size: 30,
      end: 'now',
      start: 'now-48h',
      query: {
        query: 'updated test query',
        language: 'kuery',
      },
      filters: [{ test: 'updated filter' }],
      combined_filter: { bool: { must: [{ test: 'filter' }] } },
    },
    schedule: {
      interval: '2h',
    },
    actions: [
      {
        id: 'action1',
        action_type_id: '.slack',
        group: 'default',
        params: {
          message: 'Updated test message',
        },
        uuid: 'test-uuid',
        alerts_filter: { query: { match_all: {} } },
        frequency: {
          summary: false,
          notify_when: 'onActionGroupChange',
          throttle: '10m',
        },
      },
    ],
  };

  it('should transform snake_case fields to camelCase for internal use', () => {
    const result = transformAttackDiscoveryScheduleUpdatePropsFromApi(mockApiUpdateProps);

    expect(result).toEqual({
      name: 'Updated Test Schedule',
      params: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          name: 'Updated Test AI',
          connectorId: 'updated-connector',
          actionTypeId: '.bedrock',
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          provider: 'Other',
        },
        size: 30,
        end: 'now',
        start: 'now-48h',
        query: {
          query: 'updated test query',
          language: 'kuery',
        },
        filters: [{ test: 'updated filter' }],
        combinedFilter: { bool: { must: [{ test: 'filter' }] } },
      },
      schedule: {
        interval: '2h',
      },
      actions: [
        {
          id: 'action1',
          actionTypeId: '.slack',
          group: 'default',
          params: {
            message: 'Updated test message',
          },
          uuid: 'test-uuid',
          alertsFilter: { query: { match_all: {} } },
          frequency: {
            summary: false,
            notifyWhen: 'onActionGroupChange',
            throttle: '10m',
          },
        },
      ],
    });
  });

  it('should handle actions without frequency', () => {
    const propsWithoutFrequency = {
      ...mockApiUpdateProps,
      actions: [
        {
          ...mockApiUpdateProps.actions[0],
          frequency: undefined,
        },
      ],
    };

    const result = transformAttackDiscoveryScheduleUpdatePropsFromApi(propsWithoutFrequency);

    expect(result.actions[0].frequency).toBeUndefined();
  });

  it('should transform multiple actions correctly', () => {
    const propsWithMultipleActions = {
      ...mockApiUpdateProps,
      actions: [
        mockApiUpdateProps.actions[0],
        {
          id: 'action2',
          action_type_id: '.email',
          group: 'default',
          params: {
            to: ['test@example.com'],
            subject: 'Alert',
          },
          uuid: 'test-uuid-2',
          alerts_filter: { query: { term: { 'kibana.alert.status': 'active' } } },
        },
      ],
    };

    const result = transformAttackDiscoveryScheduleUpdatePropsFromApi(propsWithMultipleActions);

    expect(result.actions).toHaveLength(2);
    expect(result.actions[1]).toEqual({
      id: 'action2',
      actionTypeId: '.email',
      group: 'default',
      params: {
        to: ['test@example.com'],
        subject: 'Alert',
      },
      uuid: 'test-uuid-2',
      alertsFilter: { query: { term: { 'kibana.alert.status': 'active' } } },
      frequency: undefined,
    });
  });
});
