/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse, PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { toCreatePayload, toFormState, toUpdatePayload } from './form_utils';

describe('action policy form utils', () => {
  const state = {
    name: 'Policy',
    description: 'Description',
    tags: [],
    matcher: null as PolicyMatcher | null,
    groupingMode: 'per_episode' as const,
    groupBy: [],
    throttleStrategy: 'on_status_change' as const,
    throttleInterval: '',
    destinations: [{ type: 'workflow' as const, id: 'workflow-1' }],
    inlineActions: [],
  };

  describe('toCreatePayload', () => {
    it('ignores inlineActions when building the payload', () => {
      const payload = toCreatePayload({
        ...state,
        inlineActions: [
          {
            id: 'draft-1',
            source: 'inline',
            stepType: 'slack2.sendMessage',
            connectorId: 'c1',
            params: 'm: x',
          },
        ],
      });

      expect(payload).not.toHaveProperty('inlineActions');
      expect(payload.destinations).toEqual([{ type: 'workflow', id: 'workflow-1' }]);
    });

    it('includes groupingMode and throttle strategy, omits null matcher', () => {
      expect(toCreatePayload(state)).toEqual({
        name: 'Policy',
        description: 'Description',
        grouping_mode: 'per_episode',
        throttle: { strategy: 'on_status_change', interval: null },
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      });
    });

    it('includes groupBy only for per_field mode', () => {
      const payload = toCreatePayload({
        ...state,
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttleStrategy: 'time_interval',
        throttleInterval: '5m',
      });

      expect(payload).toEqual({
        name: 'Policy',
        description: 'Description',
        grouping_mode: 'per_field',
        group_by: ['host.name'],
        throttle: { strategy: 'time_interval', interval: '5m' },
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      });
    });

    it('emits interval: null for strategies that do not require it', () => {
      const payload = toCreatePayload({
        ...state,
        throttleStrategy: 'every_time',
      });

      expect(payload.throttle).toEqual({ strategy: 'every_time', interval: null });
    });

    it('emits interval: null when strategy does not need interval, even if state holds a stale value', () => {
      const payload = toCreatePayload({
        ...state,
        throttleStrategy: 'on_status_change',
        throttleInterval: '5m',
      });

      expect(payload.throttle).toEqual({ strategy: 'on_status_change', interval: null });
    });

    it('includes structured matcher when present', () => {
      const payload = toCreatePayload({
        ...state,
        matcher: { expression: 'event.severity: critical' },
      });

      expect(payload.matcher).toEqual({ expression: 'event.severity: critical' });
    });

    it('omits matcher when only null/empty parts remain (all-null object)', () => {
      expect(
        toCreatePayload({ ...state, matcher: { tags: null, expression: null } })
      ).not.toHaveProperty('matcher');
    });

    it('omits matcher when expression is whitespace-only', () => {
      expect(toCreatePayload({ ...state, matcher: { expression: '   ' } })).not.toHaveProperty(
        'matcher'
      );
    });

    it('omits matcher when tags array is empty and expression is null', () => {
      expect(
        toCreatePayload({ ...state, matcher: { tags: [], expression: null } })
      ).not.toHaveProperty('matcher');
    });
  });

  describe('toUpdatePayload', () => {
    it('sends explicit null values for cleared nullable fields', () => {
      expect(toUpdatePayload(state, 'WzEsMV0=')).toEqual({
        version: 'WzEsMV0=',
        name: 'Policy',
        description: 'Description',
        grouping_mode: 'per_episode',
        tags: null,
        matcher: null,
        group_by: null,
        throttle: { strategy: 'on_status_change', interval: null },
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      });
    });

    it('normalizes an all-null matcher object to null', () => {
      const payload = toUpdatePayload(
        { ...state, matcher: { tags: null, expression: null } },
        'WzEsMV0='
      );
      expect(payload.matcher).toBeNull();
    });

    it('preserves concrete nullable values', () => {
      expect(
        toUpdatePayload(
          {
            ...state,
            tags: ['production'],
            matcher: { expression: 'event.severity: critical' },
            groupingMode: 'per_field',
            groupBy: ['host.name'],
            throttleStrategy: 'time_interval',
            throttleInterval: '5m',
          },
          'WzEsMV0='
        )
      ).toEqual({
        version: 'WzEsMV0=',
        name: 'Policy',
        description: 'Description',
        grouping_mode: 'per_field',
        tags: ['production'],
        matcher: { expression: 'event.severity: critical' },
        group_by: ['host.name'],
        throttle: { strategy: 'time_interval', interval: '5m' },
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      });
    });
  });

  describe('toFormState', () => {
    const severityMatcher: PolicyMatcher = { expression: 'data.severity : "critical"' };

    const baseResponse: ActionPolicyResponse = {
      id: 'policy-1',
      version: 'WzEsMV0=',
      name: 'Test Policy',
      description: 'A test policy',
      enabled: true,
      matcher: severityMatcher,
      group_by: ['host.name'],
      tags: ['production'],
      grouping_mode: 'per_field',
      throttle: { strategy: 'time_interval', interval: '5m' },
      snoozed_until: null,
      destinations: [{ type: 'workflow', id: 'workflow-2' }],
      created_by: 'elastic',
      created_at: '2026-03-01T10:00:00.000Z',
      updated_by: 'elastic',
      updated_at: '2026-03-01T10:00:00.000Z',
      auth: { owner: 'elastic', created_by_user: true },
    };

    it('maps server response to form state', () => {
      expect(toFormState(baseResponse)).toEqual({
        name: 'Test Policy',
        description: 'A test policy',
        tags: ['production'],
        matcher: severityMatcher,
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttleStrategy: 'time_interval',
        throttleInterval: '5m',
        destinations: [{ type: 'workflow', id: 'workflow-2' }],
        inlineActions: [],
      });
    });

    it('applies defaults when groupingMode and throttle are null', () => {
      expect(
        toFormState({
          ...baseResponse,
          grouping_mode: null,
          throttle: null,
          group_by: null,
          tags: null,
        })
      ).toEqual({
        name: 'Test Policy',
        description: 'A test policy',
        tags: [],
        matcher: severityMatcher,
        groupingMode: 'per_episode',
        groupBy: [],
        throttleStrategy: 'on_status_change',
        throttleInterval: '',
        destinations: [{ type: 'workflow', id: 'workflow-2' }],
        inlineActions: [],
      });
    });
  });
});
