/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAttackDiscoveryScheduleToApi } from '.';
import type { AttackDiscoverySchedule } from '../../schemas/attack_discovery/routes/public/schedules/schedules.gen';
import type { AttackDiscoveryApiSchedule } from '../../schemas/attack_discovery/routes/public/schedules/schedules_api.gen';

describe('transformAttackDiscoveryScheduleToApi', () => {
  it('returns a snake_cased object when given a full internal object', () => {
    const internal: AttackDiscoverySchedule = {
      id: 'internal-schedule-id',
      name: 'Internal Schedule',
      createdBy: 'internal-creator',
      updatedBy: 'internal-updater',
      createdAt: '2025-09-16T00:00:00.000Z',
      updatedAt: '2025-09-16T01:00:00.000Z',
      enabled: true,
      params: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          connectorId: 'internal-connector-1',
          actionTypeId: '.gen-ai',
          model: 'gpt-4',
          name: 'Internal Connector',
        },
        end: '2025-09-16T23:59:59.000Z',
        query: {
          query: 'event.category:security',
          language: 'kuery',
        },
        filters: [{ term: { 'event.action': 'login' } }],
        combinedFilter: { bool: { must: [] } },
        size: 100,
        start: '2025-09-16T00:00:00.000Z',
      },
      schedule: {
        interval: '2h',
      },
      actions: [
        {
          actionTypeId: '.email',
          group: 'default',
          id: 'internal-action-1',
          params: {
            to: ['test@example.com'],
            subject: 'Internal Alert',
          },
          uuid: 'internal-action-uuid-1',
          alertsFilter: { term: { 'signal.rule.severity': 'critical' } },
          frequency: {
            summary: false,
            notifyWhen: 'onActionGroupChange',
            throttle: '2h',
          },
        },
      ],
      lastExecution: {
        date: '2025-09-16T12:00:00.000Z',
        duration: 3000,
        status: 'active',
        message: 'Internal execution in progress',
      },
    };

    const expected: AttackDiscoveryApiSchedule = {
      id: 'internal-schedule-id',
      name: 'Internal Schedule',
      created_by: 'internal-creator',
      updated_by: 'internal-updater',
      created_at: '2025-09-16T00:00:00.000Z',
      updated_at: '2025-09-16T01:00:00.000Z',
      enabled: true,
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          connectorId: 'internal-connector-1',
          actionTypeId: '.gen-ai',
          model: 'gpt-4',
          name: 'Internal Connector',
        },
        end: '2025-09-16T23:59:59.000Z',
        query: {
          query: 'event.category:security',
          language: 'kuery',
        },
        filters: [{ term: { 'event.action': 'login' } }],
        combined_filter: { bool: { must: [] } },
        size: 100,
        start: '2025-09-16T00:00:00.000Z',
      },
      schedule: {
        interval: '2h',
      },
      actions: [
        {
          action_type_id: '.email',
          group: 'default',
          id: 'internal-action-1',
          params: {
            to: ['test@example.com'],
            subject: 'Internal Alert',
          },
          uuid: 'internal-action-uuid-1',
          alerts_filter: { term: { 'signal.rule.severity': 'critical' } },
          frequency: {
            summary: false,
            notify_when: 'onActionGroupChange',
            throttle: '2h',
          },
        },
      ],
      last_execution: {
        date: '2025-09-16T12:00:00.000Z',
        duration: 3000,
        status: 'active',
        message: 'Internal execution in progress',
      },
    };

    expect(transformAttackDiscoveryScheduleToApi(internal)).toEqual(expected);
  });

  it('returns expected shape when optional fields are missing', () => {
    const minimal: AttackDiscoverySchedule = {
      id: 'minimal-id',
      name: 'Minimal Schedule',
      createdBy: 'minimal-creator',
      updatedBy: 'minimal-updater',
      createdAt: '2025-09-16T00:00:00.000Z',
      updatedAt: '2025-09-16T00:00:00.000Z',
      enabled: false,
      params: {
        alertsIndexPattern: '.alerts-minimal',
        apiConfig: {
          connectorId: 'minimal-connector',
          actionTypeId: '.gen-ai',
          model: 'gpt-3.5-turbo',
          name: 'Minimal Connector',
        },
        size: 25,
        // All other fields are optional and omitted
      },
      schedule: {
        interval: '12h',
      },
      actions: [
        {
          actionTypeId: '.webhook',
          id: 'minimal-action',
          params: {
            url: 'https://example.com/webhook',
          },
          // Optional fields omitted
        },
      ],
      // lastExecution omitted
    };

    const expected: AttackDiscoveryApiSchedule = {
      id: 'minimal-id',
      name: 'Minimal Schedule',
      created_by: 'minimal-creator',
      updated_by: 'minimal-updater',
      created_at: '2025-09-16T00:00:00.000Z',
      updated_at: '2025-09-16T00:00:00.000Z',
      enabled: false,
      params: {
        alerts_index_pattern: '.alerts-minimal',
        api_config: {
          connectorId: 'minimal-connector',
          actionTypeId: '.gen-ai',
          model: 'gpt-3.5-turbo',
          name: 'Minimal Connector',
        },
        end: undefined,
        query: undefined,
        filters: undefined,
        combined_filter: undefined,
        size: 25,
        start: undefined,
      },
      schedule: {
        interval: '12h',
      },
      actions: [
        {
          action_type_id: '.webhook',
          group: undefined,
          id: 'minimal-action',
          params: {
            url: 'https://example.com/webhook',
          },
          uuid: undefined,
          alerts_filter: undefined,
          frequency: undefined,
        },
      ],
      last_execution: undefined,
    };

    expect(transformAttackDiscoveryScheduleToApi(minimal)).toEqual(expected);
  });
});
