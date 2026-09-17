/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAction, RuleSystemAction } from '../../../../../common';
import { transformRuleToRuleResponseInternal } from './v1';

describe('transformRuleToRuleResponseInternal', () => {
  const defaultAction: RuleAction = {
    id: '1',
    uuid: '111',
    params: { foo: 'bar' },
    group: 'default',
    actionTypeId: '.test',
    frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1h' },
    alertsFilter: {
      query: { dsl: '{test:1}', kql: 'test:1s', filters: [] },
      timeframe: {
        days: [1, 2, 3],
        hours: { end: '15:00', start: '00:00' },
        timezone: 'UTC',
      },
    },
  };

  const systemAction: RuleSystemAction = {
    id: '1',
    uuid: '111',
    params: { foo: 'bar' },
    actionTypeId: '.test',
  };

  const rule = {
    id: '3d534c70-582b-11ec-8995-2b1578a3bc5d',
    enabled: true,
    name: 'stressing index-threshold 37/200',
    tags: [],
    alertTypeId: '.index-threshold',
    consumer: 'alerts',
    schedule: {
      interval: '1s',
    },
    actions: [],
    params: {},
    createdBy: 'elastic',
    updatedBy: '2889684073',
    createdAt: new Date('2023-08-01T09:16:35.368Z'),
    updatedAt: new Date('2023-08-01T09:16:35.368Z'),
    notifyWhen: 'onActiveAlert' as const,
    throttle: null,
    apiKey: null,
    apiKeyOwner: '2889684073',
    muteAll: false,
    mutedInstanceIds: [],
    scheduledTaskId: '52125fb0-5895-11ec-ae69-bb65d1a71b72',
    executionStatus: {
      status: 'ok' as const,
      lastExecutionDate: new Date('2023-08-01T09:16:35.368Z'),
      lastDuration: 1194,
    },
    revision: 0,
  };

  describe('actions', () => {
    it('transforms a default action correctly', () => {
      const res = transformRuleToRuleResponseInternal({ ...rule, actions: [defaultAction] });
      expect(res.actions).toEqual([
        {
          alerts_filter: {
            query: { dsl: '{test:1}', filters: [], kql: 'test:1s' },
            timeframe: {
              days: [1, 2, 3],
              hours: { end: '15:00', start: '00:00' },
              timezone: 'UTC',
            },
          },
          connector_type_id: '.test',
          frequency: { notify_when: 'onThrottleInterval', summary: true, throttle: '1h' },
          group: 'default',
          id: '1',
          params: { foo: 'bar' },
          uuid: '111',
        },
      ]);
    });

    it('transforms a system action correctly', () => {
      const res = transformRuleToRuleResponseInternal({ ...rule, systemActions: [systemAction] });
      expect(res.actions).toEqual([
        {
          id: '1',
          uuid: '111',
          params: { foo: 'bar' },
          connector_type_id: '.test',
        },
      ]);
    });
  });

  describe('profile uid fields', () => {
    it('omits the fields when absent from the rule', () => {
      const res = transformRuleToRuleResponseInternal(rule);
      expect(res).not.toHaveProperty('created_by_profile_uid');
      expect(res).not.toHaveProperty('updated_by_profile_uid');
      expect(res).not.toHaveProperty('api_key_owner_profile_uid');
    });

    it('includes the fields when present on the rule', () => {
      const res = transformRuleToRuleResponseInternal({
        ...rule,
        createdByProfileUid: 'u_profile_created',
        updatedByProfileUid: 'u_profile_updated',
        apiKeyOwnerProfileUid: 'u_profile_api_key_owner',
      });
      expect(res.created_by_profile_uid).toBe('u_profile_created');
      expect(res.updated_by_profile_uid).toBe('u_profile_updated');
      expect(res.api_key_owner_profile_uid).toBe('u_profile_api_key_owner');
    });

    it('preserves an explicit null, like created_by/updated_by', () => {
      const res = transformRuleToRuleResponseInternal({
        ...rule,
        createdByProfileUid: null,
        updatedByProfileUid: null,
        apiKeyOwnerProfileUid: null,
      });
      expect(res).toHaveProperty('created_by_profile_uid', null);
      expect(res).toHaveProperty('updated_by_profile_uid', null);
      expect(res).toHaveProperty('api_key_owner_profile_uid', null);
    });
  });
});
