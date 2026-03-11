/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';
import {
  mapFormValuesToRuleRequest,
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
  mapRuleResponseToFormValues,
} from './rule_request_mappers';
import type { RuleRequestCommon } from './rule_request_mappers';

describe('rule_request_mappers', () => {
  const baseFormValues: FormValues = {
    kind: 'signal',
    metadata: {
      name: 'Test Rule',
      enabled: true,
      owner: 'test-owner',
      labels: ['tag1', 'tag2'],
    },
    timeField: '@timestamp',
    schedule: { every: '5m', lookback: '1m' },
    evaluation: {
      query: {
        base: 'FROM logs-* | LIMIT 10',
      },
    },
  };

  describe('mapFormValuesToRuleRequest', () => {
    it('maps basic form values to the common API shape', () => {
      const result = mapFormValuesToRuleRequest(baseFormValues);

      expect(result).toEqual({
        metadata: { name: 'Test Rule', owner: 'test-owner', labels: ['tag1', 'tag2'] },
        time_field: '@timestamp',
        schedule: { every: '5m', lookback: '1m' },
        evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        grouping: undefined,
        recovery_policy: undefined,
        state_transition: undefined,
      });
    });

    it('does not include kind in the common shape', () => {
      const result = mapFormValuesToRuleRequest(baseFormValues);

      expect(result).not.toHaveProperty('kind');
    });

    it('omits empty condition from evaluation query', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        evaluation: { query: { base: 'FROM logs', condition: '' } },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.evaluation.query).toEqual({ base: 'FROM logs' });
      expect(result.evaluation.query).not.toHaveProperty('condition');
    });

    it('includes non-empty condition in evaluation query', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        evaluation: {
          query: { base: 'FROM logs | STATS count() BY host', condition: 'WHERE count > 100' },
        },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.evaluation.query).toEqual({
        base: 'FROM logs | STATS count() BY host',
        condition: 'WHERE count > 100',
      });
    });

    it('maps grouping fields when present', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        grouping: { fields: ['host.name', 'service.name'] },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.grouping).toEqual({ fields: ['host.name', 'service.name'] });
    });

    it('returns undefined grouping when fields array is empty', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        grouping: { fields: [] },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.grouping).toBeUndefined();
    });

    it('maps recovery_policy type no_breach without query', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        recoveryPolicy: { type: 'no_breach' },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.recovery_policy).toEqual({ type: 'no_breach' });
      expect(result.recovery_policy!.query).toBeUndefined();
    });

    it('maps recovery_policy type query with condition-only mode', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        evaluation: {
          query: { base: 'FROM logs | STATS count() BY host', condition: 'WHERE count > 100' },
        },
        recoveryPolicy: {
          type: 'query',
          query: { condition: 'WHERE count <= 50' },
        },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.recovery_policy).toEqual({
        type: 'query',
        query: {
          base: 'FROM logs | STATS count() BY host',
          condition: 'WHERE count <= 50',
        },
      });
    });

    it('maps recovery_policy type query with full base query', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM logs | WHERE status = "ok"' },
        },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.recovery_policy).toEqual({
        type: 'query',
        query: { base: 'FROM logs | WHERE status = "ok"' },
      });
    });

    it('maps recovery_policy type query with explicit recovery base overriding evaluation base', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        evaluation: { query: { base: 'FROM logs | STATS count() BY host' } },
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM other_index', condition: 'WHERE recovered = true' },
        },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.recovery_policy).toEqual({
        type: 'query',
        query: { base: 'FROM other_index', condition: 'WHERE recovered = true' },
      });
    });

    it('maps state_transition for alert kind with pending count and timeframe', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        stateTransition: { pendingCount: 3, pendingTimeframe: '10m' },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({ pending_count: 3, pending_timeframe: '10m' });
    });

    it('maps state_transition with only pending count (no timeframe)', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        stateTransition: { pendingCount: 5 },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({ pending_count: 5 });
      expect(result.state_transition).not.toHaveProperty('pending_timeframe');
    });

    it('returns undefined state_transition for signal kind even with stateTransition data', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'signal',
        stateTransition: { pendingCount: 3, pendingTimeframe: '10m' },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toBeUndefined();
    });

    it('returns undefined state_transition for alert kind when stateTransition is empty', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        stateTransition: {},
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toBeUndefined();
    });

    it('strips enabled and description from metadata (API does not accept them)', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        metadata: {
          name: 'My Rule',
          enabled: false,
          description: 'A description',
          owner: 'owner',
          labels: [],
        },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.metadata).toEqual({ name: 'My Rule', owner: 'owner', labels: [] });
      expect(result.metadata).not.toHaveProperty('enabled');
      expect(result.metadata).not.toHaveProperty('description');
    });

    it('passes artifacts through to API request', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [{ id: 'artifact-1', type: 'host', value: 'host-a' }],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([{ id: 'artifact-1', type: 'host', value: 'host-a' }]);
    });

    it('maps metadata.runbook into a runbook artifact', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        metadata: {
          ...baseFormValues.metadata,
          runbook: 'Runbook markdown content',
        },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts?.[0]).toEqual(
        expect.objectContaining({
          type: 'runbook',
          value: 'Runbook markdown content',
        })
      );
      expect(result.artifacts?.[0].id).toEqual(expect.any(String));
    });

    it('replaces existing runbook artifact value while preserving artifact id', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        metadata: {
          ...baseFormValues.metadata,
          runbook: 'Updated runbook',
        },
        artifacts: [
          { id: 'artifact-1', type: 'host', value: 'host-a' },
          { id: 'existing-runbook-id', type: 'runbook', value: 'Old runbook' },
        ],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', value: 'host-a' },
        { id: 'existing-runbook-id', type: 'runbook', value: 'Updated runbook' },
      ]);
    });
  });

  describe('mapFormValuesToCreateRequest', () => {
    it('includes kind along with the common request shape', () => {
      const result = mapFormValuesToCreateRequest(baseFormValues);

      expect(result.kind).toBe('signal');
      expect(result.metadata).toEqual({
        name: 'Test Rule',
        owner: 'test-owner',
        labels: ['tag1', 'tag2'],
      });
      expect(result.time_field).toBe('@timestamp');
    });

    it('produces a superset of mapFormValuesToRuleRequest', () => {
      const common = mapFormValuesToRuleRequest(baseFormValues);
      const create = mapFormValuesToCreateRequest(baseFormValues);
      const createRequest = create as typeof create & {
        artifacts?: RuleRequestCommon['artifacts'];
      };

      // Every key in common should be present in create with the same value
      for (const key of Object.keys(common) as Array<keyof typeof common>) {
        expect(createRequest[key]).toEqual(common[key]);
      }
    });
  });

  describe('mapFormValuesToUpdateRequest', () => {
    it('coerces undefined optional fields to null for explicit removal', () => {
      const result = mapFormValuesToUpdateRequest(baseFormValues);
      const updateRequest = result as typeof result & {
        artifacts?: RuleRequestCommon['artifacts'] | null;
      };

      expect(updateRequest.grouping).toBeNull();
      expect(updateRequest.recovery_policy).toBeNull();
      expect(updateRequest.state_transition).toBeNull();
      expect(updateRequest.artifacts).toBeNull();
    });

    it('does not include kind in the update payload', () => {
      const result = mapFormValuesToUpdateRequest(baseFormValues);

      expect(result).not.toHaveProperty('kind');
    });

    it('passes through present optional fields without coercion', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        grouping: { fields: ['host.name'] },
        recoveryPolicy: { type: 'no_breach' },
        stateTransition: { pendingCount: 2, pendingTimeframe: '5m' },
      };

      const result = mapFormValuesToUpdateRequest(formValues);

      expect(result.grouping).toEqual({ fields: ['host.name'] });
      expect(result.recovery_policy).toEqual({ type: 'no_breach' });
      expect(result.state_transition).toEqual({ pending_count: 2, pending_timeframe: '5m' });
    });

    it('nullifies empty grouping fields instead of leaving as undefined', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        grouping: { fields: [] },
      };

      const result = mapFormValuesToUpdateRequest(formValues);

      // Empty fields → mapGrouping returns undefined → coerced to null
      expect(result.grouping).toBeNull();
    });

    it('includes required fields from the common mapper', () => {
      const result = mapFormValuesToUpdateRequest(baseFormValues);

      expect(result.metadata).toEqual({
        name: 'Test Rule',
        owner: 'test-owner',
        labels: ['tag1', 'tag2'],
      });
      expect(result.time_field).toBe('@timestamp');
      expect(result.schedule).toEqual({ every: '5m', lookback: '1m' });
      expect(result.evaluation).toEqual({ query: { base: 'FROM logs-* | LIMIT 10' } });
    });
  });

  describe('mapRuleResponseToFormValues', () => {
    const baseRuleResponse: RuleResponse = {
      id: 'rule-1',
      kind: 'alert',
      enabled: true,
      metadata: {
        name: 'Test Rule',
        owner: 'test-owner',
        labels: ['tag1'],
      },
      time_field: '@timestamp',
      schedule: {
        every: '5m',
        lookback: '2m',
      },
      evaluation: {
        query: {
          base: 'FROM logs-* | STATS count() BY host',
          condition: 'WHERE count > 100',
        },
      },
    } as RuleResponse;

    it('maps basic required fields', () => {
      const result = mapRuleResponseToFormValues(baseRuleResponse);

      expect(result.kind).toBe('alert');
      expect(result.timeField).toBe('@timestamp');
      expect(result.metadata).toEqual({
        name: 'Test Rule',
        enabled: true,
        owner: 'test-owner',
        labels: ['tag1'],
      });
    });

    it('maps schedule with existing lookback', () => {
      const result = mapRuleResponseToFormValues(baseRuleResponse);

      expect(result.schedule).toEqual({ every: '5m', lookback: '2m' });
    });

    it('defaults lookback to 1m when not present in response', () => {
      const rule = {
        ...baseRuleResponse,
        schedule: { every: '10m' },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.schedule).toEqual({ every: '10m', lookback: '1m' });
    });

    it('maps evaluation query with condition', () => {
      const result = mapRuleResponseToFormValues(baseRuleResponse);

      expect(result.evaluation).toEqual({
        query: {
          base: 'FROM logs-* | STATS count() BY host',
          condition: 'WHERE count > 100',
        },
      });
    });

    it('maps evaluation query without condition', () => {
      const rule = {
        ...baseRuleResponse,
        evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.evaluation).toEqual({
        query: {
          base: 'FROM logs-* | LIMIT 10',
          condition: undefined,
        },
      });
    });

    it('maps grouping when present', () => {
      const rule = {
        ...baseRuleResponse,
        grouping: { fields: ['host.name', 'service.name'] },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.grouping).toEqual({ fields: ['host.name', 'service.name'] });
    });

    it('omits grouping when not present in response', () => {
      const result = mapRuleResponseToFormValues(baseRuleResponse);

      expect(result).not.toHaveProperty('grouping');
    });

    it('maps recovery_policy with query', () => {
      const rule = {
        ...baseRuleResponse,
        recovery_policy: {
          type: 'query',
          query: { base: 'FROM logs', condition: 'WHERE recovered = true' },
        },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.recoveryPolicy).toEqual({
        type: 'query',
        query: { base: 'FROM logs', condition: 'WHERE recovered = true' },
      });
    });

    it('maps recovery_policy without query (no_breach)', () => {
      const rule = {
        ...baseRuleResponse,
        recovery_policy: { type: 'no_breach' },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.recoveryPolicy).toEqual({ type: 'no_breach' });
      expect(result.recoveryPolicy!.query).toBeUndefined();
    });

    it('omits recoveryPolicy when not present in response', () => {
      const result = mapRuleResponseToFormValues(baseRuleResponse);

      expect(result).not.toHaveProperty('recoveryPolicy');
    });

    it('maps state_transition when present', () => {
      const rule = {
        ...baseRuleResponse,
        state_transition: { pending_count: 3, pending_timeframe: '10m' },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.stateTransition).toEqual({
        pendingCount: 3,
        pendingTimeframe: '10m',
      });
    });

    it('omits stateTransition when not present in response', () => {
      const result = mapRuleResponseToFormValues(baseRuleResponse);

      expect(result).not.toHaveProperty('stateTransition');
    });

    it('maps artifacts when present', () => {
      const rule = {
        ...baseRuleResponse,
        artifacts: [
          { id: 'artifact-1', type: 'host', value: 'host-a' },
          { id: 'runbook-id', type: 'runbook', value: 'Runbook from API' },
        ],
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', value: 'host-a' },
        { id: 'runbook-id', type: 'runbook', value: 'Runbook from API' },
      ]);
      expect(result.metadata?.runbook).toBeUndefined();
    });

    it('roundtrips: create request from mapped response matches original API payload', () => {
      const fullRule = {
        ...baseRuleResponse,
        grouping: { fields: ['host.name'] },
        recovery_policy: {
          type: 'query',
          query: { base: 'FROM logs-* | STATS count() BY host', condition: 'WHERE count <= 50' },
        },
        state_transition: { pending_count: 3, pending_timeframe: '10m' },
      } as RuleResponse;

      const formValues = mapRuleResponseToFormValues(fullRule);

      // Fill in required fields that mapRuleResponseToFormValues returns
      const completeFormValues: FormValues = {
        kind: formValues.kind!,
        metadata: formValues.metadata!,
        timeField: formValues.timeField!,
        schedule: formValues.schedule as FormValues['schedule'],
        evaluation: formValues.evaluation!,
        grouping: formValues.grouping,
        recoveryPolicy: formValues.recoveryPolicy,
        stateTransition: formValues.stateTransition,
        artifacts: formValues.artifacts,
      };

      const createPayload = mapFormValuesToCreateRequest(completeFormValues);

      expect(createPayload.kind).toBe('alert');
      expect(createPayload.evaluation.query.base).toBe('FROM logs-* | STATS count() BY host');
      expect(createPayload.evaluation.query.condition).toBe('WHERE count > 100');
      expect(createPayload.grouping).toEqual({ fields: ['host.name'] });
      expect(createPayload.recovery_policy).toEqual({
        type: 'query',
        query: { base: 'FROM logs-* | STATS count() BY host', condition: 'WHERE count <= 50' },
      });
      expect(createPayload.state_transition).toEqual({
        pending_count: 3,
        pending_timeframe: '10m',
      });
    });
  });
});
