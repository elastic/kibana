/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttackDiscoveryScheduleCreatePropsFromApi } from '.';
import type { AttackDiscoveryApiScheduleCreateProps } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

describe('transformAttackDiscoveryScheduleCreatePropsFromApi', () => {
  const mockApiCreateProps: AttackDiscoveryApiScheduleCreateProps = {
    name: 'Test Schedule',
    enabled: true,
    params: {
      alerts_index_pattern: '.alerts-security.alerts-default',
      api_config: {
        name: 'Test AI',
        connectorId: 'test-connector',
        actionTypeId: '.bedrock',
        model: 'anthropic.claude-3-sonnet-20240229-v1:0',
        provider: 'Other',
      },
      size: 20,
      end: 'now',
      start: 'now-24h',
      query: {
        query: 'test query',
        language: 'kuery',
      },
      filters: [{ test: 'filter' }],
      combined_filter: { bool: { must: [] } },
    },
    schedule: {
      interval: '1h',
    },
    actions: [
      {
        id: 'action1',
        action_type_id: '.slack',
        group: 'default',
        params: {
          message: 'Test message',
        },
        uuid: 'test-uuid',
        alerts_filter: { query: { match_all: {} } },
        frequency: {
          summary: true,
          notify_when: 'onActiveAlert',
          throttle: '5m',
        },
      },
    ],
  };

  it('should transform snake_case fields to camelCase for internal use', () => {
    const result = transformAttackDiscoveryScheduleCreatePropsFromApi(mockApiCreateProps);

    expect(result).toEqual({
      name: 'Test Schedule',
      enabled: true,
      params: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          name: 'Test AI',
          connectorId: 'test-connector',
          actionTypeId: '.bedrock',
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
          provider: 'Other',
        },
        size: 20,
        end: 'now',
        start: 'now-24h',
        query: {
          query: 'test query',
          language: 'kuery',
        },
        filters: [{ test: 'filter' }],
        combinedFilter: { bool: { must: [] } },
      },
      schedule: {
        interval: '1h',
      },
      actions: [
        {
          id: 'action1',
          actionTypeId: '.slack',
          group: 'default',
          params: {
            message: 'Test message',
          },
          uuid: 'test-uuid',
          alertsFilter: { query: { match_all: {} } },
          frequency: {
            summary: true,
            notifyWhen: 'onActiveAlert',
            throttle: '5m',
          },
        },
      ],
    });
  });

  it('should handle minimal API create props', () => {
    const minimalApiCreateProps: AttackDiscoveryApiScheduleCreateProps = {
      name: 'Minimal Schedule',
      params: {
        alerts_index_pattern: '.alerts-minimal',
        api_config: {
          name: 'Minimal AI',
          connectorId: 'minimal-connector',
          actionTypeId: '.gen-ai',
        },
        size: 10,
      },
      schedule: {
        interval: '30m',
      },
    };

    const result = transformAttackDiscoveryScheduleCreatePropsFromApi(minimalApiCreateProps);

    expect(result).toEqual({
      name: 'Minimal Schedule',
      enabled: undefined,
      params: {
        alertsIndexPattern: '.alerts-minimal',
        apiConfig: {
          name: 'Minimal AI',
          connectorId: 'minimal-connector',
          actionTypeId: '.gen-ai',
        },
        size: 10,
        end: undefined,
        start: undefined,
        query: undefined,
        filters: undefined,
        combinedFilter: undefined,
      },
      schedule: {
        interval: '30m',
      },
      actions: undefined,
    });
  });

  it('should handle undefined actions array', () => {
    const createPropsWithoutActions = {
      ...mockApiCreateProps,
      actions: undefined,
    };

    const result = transformAttackDiscoveryScheduleCreatePropsFromApi(createPropsWithoutActions);

    expect(result.actions).toBeUndefined();
  });

  it('should handle actions without frequency', () => {
    const createPropsWithActionWithoutFrequency = {
      ...mockApiCreateProps,
      actions: [
        {
          id: 'action1',
          action_type_id: '.slack',
          group: 'default',
          params: {
            message: 'Test message',
          },
        },
      ],
    };

    const result = transformAttackDiscoveryScheduleCreatePropsFromApi(
      createPropsWithActionWithoutFrequency
    );

    expect(result.actions?.[0].frequency).toBeUndefined();
  });

  it('should handle actions without optional fields', () => {
    const createPropsWithMinimalAction = {
      ...mockApiCreateProps,
      actions: [
        {
          id: 'action1',
          action_type_id: '.slack',
          params: {
            message: 'Test message',
          },
        },
      ],
    };

    const result = transformAttackDiscoveryScheduleCreatePropsFromApi(createPropsWithMinimalAction);

    expect(result.actions?.[0]).toEqual({
      id: 'action1',
      actionTypeId: '.slack',
      params: {
        message: 'Test message',
      },
      group: undefined,
      uuid: undefined,
      alertsFilter: undefined,
      frequency: undefined,
    });
  });
});
