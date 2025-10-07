/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttackDiscoveryScheduleFromApi } from '.';
import type { AttackDiscoverySchedule } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type { AttackDiscoveryApiSchedule } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

describe('transformAttackDiscoveryScheduleFromApi', () => {
  const fullApiMock: AttackDiscoveryApiSchedule = {
    id: 'schedule-id-1',
    name: 'Test Schedule',
    created_by: 'user-creator',
    updated_by: 'user-updater',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-02T00:00:00.000Z',
    enabled: true,
    params: {
      alerts_index_pattern: '.alerts-security.alerts-default',
      api_config: {
        connectorId: 'connector-1',
        actionTypeId: '.gen-ai',
        model: 'gpt-4',
        name: 'Test Connector',
      },
      end: '2025-01-01T23:59:59.000Z',
      query: {
        query: 'event.category:security',
        language: 'kuery',
      },
      filters: [{ term: { 'event.action': 'login' } }],
      combined_filter: { bool: { must: [] } },
      size: 100,
      start: '2025-01-01T00:00:00.000Z',
    },
    schedule: {
      interval: '1h',
    },
    actions: [
      {
        action_type_id: '.email',
        group: 'default',
        id: 'action-1',
        params: {
          to: ['admin@example.com'],
          subject: 'Attack Discovery Alert',
        },
        uuid: 'action-uuid-1',
        alerts_filter: { term: { 'signal.rule.severity': 'high' } },
        frequency: {
          summary: true,
          notify_when: 'onActiveAlert',
          throttle: '1h',
        },
      },
    ],
    last_execution: {
      date: '2025-01-01T12:00:00.000Z',
      duration: 5000,
      status: 'ok',
      message: 'Execution successful',
    },
  };

  it('returns a camelCased object when given a full API object', () => {
    const result: AttackDiscoverySchedule = transformAttackDiscoveryScheduleFromApi(fullApiMock);
    const expected: AttackDiscoverySchedule = {
      id: 'schedule-id-1',
      name: 'Test Schedule',
      createdBy: 'user-creator',
      updatedBy: 'user-updater',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
      enabled: true,
      params: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          connectorId: 'connector-1',
          actionTypeId: '.gen-ai',
          model: 'gpt-4',
          name: 'Test Connector',
        },
        end: '2025-01-01T23:59:59.000Z',
        query: {
          query: 'event.category:security',
          language: 'kuery',
        },
        filters: [{ term: { 'event.action': 'login' } }],
        combinedFilter: { bool: { must: [] } },
        size: 100,
        start: '2025-01-01T00:00:00.000Z',
      },
      schedule: {
        interval: '1h',
      },
      actions: [
        {
          actionTypeId: '.email',
          group: 'default',
          id: 'action-1',
          params: {
            to: ['admin@example.com'],
            subject: 'Attack Discovery Alert',
          },
          uuid: 'action-uuid-1',
          alertsFilter: { term: { 'signal.rule.severity': 'high' } },
          frequency: {
            summary: true,
            notifyWhen: 'onActiveAlert',
            throttle: '1h',
          },
        },
      ],
      lastExecution: {
        date: '2025-01-01T12:00:00.000Z',
        duration: 5000,
        status: 'ok',
        message: 'Execution successful',
      },
    };
    expect(result).toEqual(expected);
  });

  it('returns expected shape when optional fields are missing', () => {
    const onlyRequiredFields: AttackDiscoveryApiSchedule = {
      id: 'schedule-id-2',
      name: 'Minimal Schedule',
      created_by: 'creator-2',
      updated_by: 'updater-2',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      enabled: false,
      params: {
        alerts_index_pattern: '.alerts-*',
        api_config: {
          connectorId: 'connector-2',
          actionTypeId: '.gen-ai',
          model: 'gpt-3.5-turbo',
          name: 'Minimal Connector',
        },
        size: 50,
        // all optionals omitted
      },
      schedule: {
        interval: '24h',
      },
      actions: [
        {
          action_type_id: '.slack',
          id: 'action-2',
          params: {
            message: 'Alert triggered',
          },
          // optional fields omitted
        },
      ],
      // last_execution omitted
    };

    const result: AttackDiscoverySchedule =
      transformAttackDiscoveryScheduleFromApi(onlyRequiredFields);
    const expected: AttackDiscoverySchedule = {
      id: 'schedule-id-2',
      name: 'Minimal Schedule',
      createdBy: 'creator-2',
      updatedBy: 'updater-2',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      enabled: false,
      params: {
        alertsIndexPattern: '.alerts-*',
        apiConfig: {
          connectorId: 'connector-2',
          actionTypeId: '.gen-ai',
          model: 'gpt-3.5-turbo',
          name: 'Minimal Connector',
        },
        end: undefined,
        query: undefined,
        filters: undefined,
        combinedFilter: undefined,
        size: 50,
        start: undefined,
      },
      schedule: {
        interval: '24h',
      },
      actions: [
        {
          actionTypeId: '.slack',
          group: undefined,
          id: 'action-2',
          params: {
            message: 'Alert triggered',
          },
          uuid: undefined,
          alertsFilter: undefined,
          frequency: undefined,
        },
      ],
      lastExecution: undefined,
    };
    expect(result).toEqual(expected);
  });
});
