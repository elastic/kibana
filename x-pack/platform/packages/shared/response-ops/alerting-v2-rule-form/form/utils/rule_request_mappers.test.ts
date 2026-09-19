/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { noDataStrategy, recoveryStrategy } from '@kbn/alerting-v2-schemas';
import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
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
      tags: ['tag1', 'tag2'],
    },
    timeField: '@timestamp',
    schedule: { every: '5m', lookback: '1m' },
    query: {
      base: 'FROM logs-* | LIMIT 10',
      breach: { segment: '' },
    },
    stateTransitionAlertDelayMode: 'immediate',
    stateTransitionRecoveryDelayMode: 'immediate',
  };

  describe('mapFormValuesToRuleRequest', () => {
    it('maps basic form values to the common API shape', () => {
      const result = mapFormValuesToRuleRequest(baseFormValues);

      expect(result).toEqual({
        metadata: { name: 'Test Rule', owner: 'test-owner', tags: ['tag1', 'tag2'] },
        time_field: '@timestamp',
        schedule: { every: '5m', lookback: '1m' },
        query: { base: 'FROM logs-* | LIMIT 10' },
        grouping: undefined,
        state_transition: undefined,
      });
    });

    it('keeps the breach block when the segment is non-empty', () => {
      const result = mapFormValuesToRuleRequest({
        ...baseFormValues,
        query: { base: 'FROM logs-*', breach: { segment: 'WHERE count > 10' } },
      });

      expect(result.query).toEqual({
        base: 'FROM logs-*',
        breach: { segment: 'WHERE count > 10' },
      });
    });

    it('does not include kind in the common shape', () => {
      const result = mapFormValuesToRuleRequest(baseFormValues);

      expect(result).not.toHaveProperty('kind');
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

    it('maps state_transition for alert kind with pending count and timeframe', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        stateTransitionAlertDelayMode: 'duration',
        stateTransitionRecoveryDelayMode: 'immediate',
        stateTransition: { pendingCount: 3, pendingTimeframe: '10m' },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({
        pending: { count: 3, timeframe: '10m' },
        recovering: { count: 0 },
      });
    });

    it('maps state_transition with only pending count (no timeframe)', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        stateTransitionAlertDelayMode: 'breaches',
        stateTransitionRecoveryDelayMode: 'immediate',
        stateTransition: { pendingCount: 5 },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({
        pending: { count: 5 },
        recovering: { count: 0 },
      });
      expect(result.state_transition?.pending).not.toHaveProperty('timeframe');
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

    it('emits pending and recovering counts of 0 for an alert with recovery enabled when both modes are immediate', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: { strategy: recoveryStrategy.no_breach },
        stateTransition: {},
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({
        pending: { count: 0 },
        recovering: { count: 0 },
      });
    });

    it('omits the recovering phase for an alert when recovery is disabled and both modes are immediate', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: { strategy: recoveryStrategy.manual },
        stateTransition: {},
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({ pending: { count: 0 } });
    });

    it('omits the recovering phase for an alert when recovery is disabled and stateTransition is undefined', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: { strategy: recoveryStrategy.manual },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({ pending: { count: 0 } });
    });

    it('omits the recovering phase under recovery.strategy "manual" even if recovering values are set', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: { strategy: recoveryStrategy.manual },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'duration',
        stateTransition: { recoveringCount: 3, recoveringTimeframe: '5m' },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({ pending: { count: 0 } });
    });

    it('emits a pending count of 0 when alert delay mode is immediate even if pendingCount is stale', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: { strategy: recoveryStrategy.no_breach },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'recoveries',
        stateTransition: {
          pendingCount: 2,
          pendingTimeframe: null,
          recoveringCount: 3,
          recoveringTimeframe: null,
        },
      };

      expect(mapFormValuesToUpdateRequest(formValues).state_transition).toEqual({
        pending: { count: 0 },
        recovering: { count: 3 },
      });
    });

    it('maps state_transition with recovering count and timeframe', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: { strategy: recoveryStrategy.no_breach },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'duration',
        stateTransition: { recoveringCount: 4, recoveringTimeframe: '15m' },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({
        pending: { count: 0 },
        recovering: { count: 4, timeframe: '15m' },
      });
    });

    it('maps state_transition with only recovering count (no timeframe)', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: { strategy: recoveryStrategy.no_breach },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'recoveries',
        stateTransition: { recoveringCount: 3 },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({
        pending: { count: 0 },
        recovering: { count: 3 },
      });
      expect(result.state_transition?.recovering).not.toHaveProperty('timeframe');
    });

    it('maps state_transition with both pending and recovering phases', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: { strategy: recoveryStrategy.no_breach },
        stateTransitionAlertDelayMode: 'breaches',
        stateTransitionRecoveryDelayMode: 'duration',
        stateTransition: {
          pendingCount: 2,
          recoveringCount: 5,
          recoveringTimeframe: '10m',
        },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.state_transition).toEqual({
        pending: { count: 2 },
        recovering: { count: 5, timeframe: '10m' },
      });
    });

    it('strips enabled from metadata (server-managed) but includes description', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        metadata: {
          name: 'My Rule',
          enabled: false,
          description: 'A description',
          owner: 'owner',
          tags: [],
        },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.metadata).toEqual({
        name: 'My Rule',
        description: 'A description',
        owner: 'owner',
      });
      expect(result.metadata).not.toHaveProperty('enabled');
      expect(result.metadata).not.toHaveProperty('tags');
    });

    it('passes artifacts through to API request', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [{ id: 'artifact-1', type: 'host', data: { value: 'host-a' } }],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
      ]);
    });

    it('merges split artifact fields into API request', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [{ id: 'artifact-1', type: 'host', data: { value: 'host-a' } }],
        runbookArtifacts: [
          {
            id: 'runbook-id',
            type: RUNBOOK_ARTIFACT_TYPE,
            data: { content: 'Runbook steps' },
          },
        ],
        dashboardArtifacts: [
          {
            id: 'dashboard-id',
            type: DASHBOARD_ARTIFACT_TYPE,
            data: { dashboard_id: 'dashboard-123' },
          },
        ],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
        {
          id: 'runbook-id',
          type: RUNBOOK_ARTIFACT_TYPE,
          data: { content: 'Runbook steps' },
        },
        {
          id: 'dashboard-id',
          type: DASHBOARD_ARTIFACT_TYPE,
          data: { dashboard_id: 'dashboard-123' },
        },
      ]);
    });

    it('passes runbook artifact data through unchanged including whitespace', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [
          { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
          {
            id: 'existing-runbook-id',
            type: RUNBOOK_ARTIFACT_TYPE,
            data: { content: '  Existing runbook  ' },
          },
        ],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
        {
          id: 'existing-runbook-id',
          type: RUNBOOK_ARTIFACT_TYPE,
          data: { content: '  Existing runbook  ' },
        },
      ]);
    });

    it('passes empty-looking runbook artifacts through without filtering', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [
          { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
          { id: 'runbook-id', type: RUNBOOK_ARTIFACT_TYPE, data: { content: '   ' } },
        ],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
        { id: 'runbook-id', type: RUNBOOK_ARTIFACT_TYPE, data: { content: '   ' } },
      ]);
    });

    it('passes through a sole empty-looking runbook artifact', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [{ id: 'runbook-id', type: RUNBOOK_ARTIFACT_TYPE, data: { content: '   ' } }],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        { id: 'runbook-id', type: RUNBOOK_ARTIFACT_TYPE, data: { content: '   ' } },
      ]);
    });

    it('omits artifacts when artifacts are empty', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toBeUndefined();
    });

    it('omits artifacts when artifacts are undefined', () => {
      const result = mapFormValuesToRuleRequest(baseFormValues);

      expect(result.artifacts).toBeUndefined();
    });

    it('maps an independent recovery query onto the query strategy', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: {
          strategy: recoveryStrategy.query,
          query: 'FROM logs-* | WHERE ok == true',
        },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.query).toEqual({ base: 'FROM logs-* | LIMIT 10' });
      expect(result.recovery).toEqual({
        strategy: 'query',
        query: 'FROM logs-* | WHERE ok == true',
      });
    });

    it('maps a recovery segment onto the condition strategy', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        query: { base: 'FROM logs-*', breach: { segment: 'WHERE count > 100' } },
        recovery: { strategy: recoveryStrategy.condition, segment: 'WHERE count < 50' },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.recovery).toEqual({ strategy: 'condition', segment: 'WHERE count < 50' });
    });

    it('omits recovery when the form carries none', () => {
      const result = mapFormValuesToRuleRequest(baseFormValues);

      expect(result.recovery).toBeUndefined();
    });

    it('includes no_data when set on an alert rule', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        noData: { strategy: noDataStrategy.resolve },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.no_data).toEqual({ strategy: 'resolve' });
    });

    it('includes a no_data presence query when provided', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        noData: { strategy: noDataStrategy.alert, query: 'FROM logs-* | LIMIT 1' },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.no_data).toEqual({
        strategy: 'alert',
        query: 'FROM logs-* | LIMIT 1',
      });
    });

    it('drops a blank no_data presence query', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        noData: { strategy: noDataStrategy.keep_last, query: '   ' },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.no_data).toEqual({ strategy: 'keep_last' });
    });

    it('omits no_data when undefined', () => {
      const result = mapFormValuesToRuleRequest(baseFormValues);

      expect(result.no_data).toBeUndefined();
    });

    it('omits recovery and no_data for signal rules even when set', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'signal',
        recovery: { strategy: recoveryStrategy.no_breach },
        noData: { strategy: noDataStrategy.resolve },
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.recovery).toBeUndefined();
      expect(result.no_data).toBeUndefined();
    });

    it('passes non-empty runbook artifact data through unchanged', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [
          { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
          {
            id: 'runbook-id',
            type: RUNBOOK_ARTIFACT_TYPE,
            data: { content: 'Valid runbook' },
          },
        ],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
        {
          id: 'runbook-id',
          type: RUNBOOK_ARTIFACT_TYPE,
          data: { content: 'Valid runbook' },
        },
      ]);
    });

    it('passes empty runbook artifact id through without generating a replacement', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [
          {
            id: '',
            type: RUNBOOK_ARTIFACT_TYPE,
            data: { content: 'Runbook with missing id' },
          },
        ],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        {
          id: '',
          type: RUNBOOK_ARTIFACT_TYPE,
          data: { content: 'Runbook with missing id' },
        },
      ]);
    });

    it('passes dashboard artifact data through unchanged including whitespace', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [
          { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
          {
            id: 'dashboard-id',
            type: DASHBOARD_ARTIFACT_TYPE,
            data: { dashboard_id: '  dashboard-123  ' },
          },
        ],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
        {
          id: 'dashboard-id',
          type: DASHBOARD_ARTIFACT_TYPE,
          data: { dashboard_id: '  dashboard-123  ' },
        },
      ]);
    });

    it('passes empty-looking dashboard artifacts through without filtering', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [
          { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
          {
            id: 'dashboard-id',
            type: DASHBOARD_ARTIFACT_TYPE,
            data: { dashboard_id: '   ' },
          },
        ],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
        {
          id: 'dashboard-id',
          type: DASHBOARD_ARTIFACT_TYPE,
          data: { dashboard_id: '   ' },
        },
      ]);
    });

    it('passes empty dashboard artifact id through without generating a replacement', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [
          {
            id: '',
            type: DASHBOARD_ARTIFACT_TYPE,
            data: { dashboard_id: 'dashboard-123' },
          },
        ],
      };

      const result = mapFormValuesToRuleRequest(formValues);

      expect(result.artifacts).toEqual([
        {
          id: '',
          type: DASHBOARD_ARTIFACT_TYPE,
          data: { dashboard_id: 'dashboard-123' },
        },
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
        tags: ['tag1', 'tag2'],
      });
      expect(result.time_field).toBe('@timestamp');
    });

    it('includes description in the create request when provided', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        metadata: {
          ...baseFormValues.metadata,
          description: 'Create rule description',
        },
      };

      const result = mapFormValuesToCreateRequest(formValues);

      expect(result.metadata.description).toBe('Create rule description');
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
      expect(updateRequest.state_transition).toBeNull();
      expect(updateRequest.artifacts).toBeNull();
    });

    it('omits recovery and no_data rather than nulling them — the update API rejects null', () => {
      const result = mapFormValuesToUpdateRequest(baseFormValues);

      expect(result).not.toHaveProperty('recovery');
      expect(result).not.toHaveProperty('no_data');
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
        recovery: { strategy: recoveryStrategy.no_breach },
        noData: { strategy: noDataStrategy.resolve },
        stateTransitionAlertDelayMode: 'duration',
        stateTransitionRecoveryDelayMode: 'immediate',
        stateTransition: { pendingCount: 2, pendingTimeframe: '5m' },
      };

      const result = mapFormValuesToUpdateRequest(formValues);

      expect(result.grouping).toEqual({ fields: ['host.name'] });
      expect(result.recovery).toEqual({ strategy: 'no_breach' });
      expect(result.no_data).toEqual({ strategy: 'resolve' });
      expect(result.state_transition).toEqual({
        pending: { count: 2, timeframe: '5m' },
        recovering: { count: 0 },
      });
    });

    it('preserves recovery.strategy: manual', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: { strategy: recoveryStrategy.manual },
      };

      const result = mapFormValuesToUpdateRequest(formValues);

      expect(result.recovery).toEqual({ strategy: 'manual' });
    });

    it('sends no_breach when the form recovery is unset', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        recovery: undefined,
      };

      const result = mapFormValuesToUpdateRequest(formValues);

      expect(result.recovery).toEqual({ strategy: 'no_breach' });
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
        tags: ['tag1', 'tag2'],
      });
      expect(result.time_field).toBe('@timestamp');
      expect(result.schedule).toEqual({ every: '5m', lookback: '1m' });
      expect(result.query).toEqual({ base: 'FROM logs-* | LIMIT 10' });
    });

    it('coerces empty artifacts array to null for explicit removal', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        artifacts: [],
      };

      const result = mapFormValuesToUpdateRequest(formValues);

      expect(result.artifacts).toBeNull();
    });

    it('omits no_data when absent', () => {
      const result = mapFormValuesToUpdateRequest(baseFormValues);

      expect(result.no_data).toBeUndefined();
    });

    it('preserves no_data when set on an alert rule', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        noData: { strategy: noDataStrategy.resolve },
      };

      const result = mapFormValuesToUpdateRequest(formValues);

      expect(result.no_data).toEqual({ strategy: 'resolve' });
    });

    it('sends the condition strategy when the user authors a recovery segment', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        kind: 'alert',
        query: { base: 'FROM logs-*', breach: { segment: 'WHERE count > 100' } },
        recovery: { strategy: recoveryStrategy.condition, segment: 'WHERE count < 50' },
      };

      const result = mapFormValuesToUpdateRequest(formValues);

      expect(result.recovery).toEqual({ strategy: 'condition', segment: 'WHERE count < 50' });
    });

    it('omits recovery for signal rules, which cannot carry it', () => {
      const formValues: FormValues = {
        ...baseFormValues,
        recovery: { strategy: recoveryStrategy.query, query: 'FROM logs-*' },
      };

      const result = mapFormValuesToUpdateRequest(formValues);

      expect(result.recovery).toBeUndefined();
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
        tags: ['tag1'],
      },
      time_field: '@timestamp',
      schedule: {
        every: '5m',
        lookback: '2m',
      },
      query: {
        base: 'FROM logs-* | STATS count() BY host',
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
        tags: ['tag1'],
      });
      expect(result.stateTransitionAlertDelayMode).toBe('immediate');
      expect(result.stateTransitionRecoveryDelayMode).toBe('immediate');
    });

    it('maps description from the API response', () => {
      const rule = {
        ...baseRuleResponse,
        metadata: { ...baseRuleResponse.metadata, description: 'A rule description' },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.metadata?.description).toBe('A rule description');
    });

    it('leaves description undefined when not present in the API response', () => {
      const result = mapRuleResponseToFormValues(baseRuleResponse);

      expect(result.metadata?.description).toBeUndefined();
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

    it('maps query to RuleQuery shape, defaulting the breach segment to empty', () => {
      const result = mapRuleResponseToFormValues(baseRuleResponse);

      expect(result.query).toEqual({
        base: 'FROM logs-* | STATS count() BY host',
        breach: { segment: '' },
      });
    });

    it('maps a breach segment through when the response carries one', () => {
      const rule = {
        ...baseRuleResponse,
        query: { base: 'FROM logs-*', breach: { segment: 'WHERE count > 10' } },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.query).toEqual({
        base: 'FROM logs-*',
        breach: { segment: 'WHERE count > 10' },
      });
    });

    it('widens the recovery union into form state', () => {
      const rule = {
        ...baseRuleResponse,
        recovery: { strategy: recoveryStrategy.condition, segment: 'WHERE count < 5' },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.recovery).toEqual({ strategy: 'condition', segment: 'WHERE count < 5' });
    });

    it('leaves recovery undefined when the response carries none', () => {
      const result = mapRuleResponseToFormValues(baseRuleResponse);

      expect(result.recovery).toBeUndefined();
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

    it('maps state_transition when present', () => {
      const rule = {
        ...baseRuleResponse,
        state_transition: { pending: { count: 3, timeframe: '10m' } },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.stateTransition).toEqual({
        pendingCount: 3,
        pendingTimeframe: '10m',
        recoveringCount: null,
        recoveringTimeframe: null,
      });
      expect(result.stateTransitionAlertDelayMode).toBe('duration');
      expect(result.stateTransitionRecoveryDelayMode).toBe('immediate');
    });

    it('maps state_transition with recovering fields', () => {
      const rule = {
        ...baseRuleResponse,
        state_transition: { recovering: { count: 5, timeframe: '15m' } },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.stateTransition).toEqual({
        pendingCount: null,
        pendingTimeframe: null,
        recoveringCount: 5,
        recoveringTimeframe: '15m',
      });
      expect(result.stateTransitionAlertDelayMode).toBe('immediate');
      expect(result.stateTransitionRecoveryDelayMode).toBe('duration');
    });

    it('maps state_transition with both pending and recovering fields', () => {
      const rule = {
        ...baseRuleResponse,
        state_transition: {
          pending: { count: 2 },
          recovering: { count: 4, timeframe: '20m' },
        },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.stateTransition).toEqual({
        pendingCount: 2,
        pendingTimeframe: null,
        recoveringCount: 4,
        recoveringTimeframe: '20m',
      });
      expect(result.stateTransitionAlertDelayMode).toBe('breaches');
      expect(result.stateTransitionRecoveryDelayMode).toBe('duration');
    });

    it('initializes stateTransition with null fields when not present in response', () => {
      const result = mapRuleResponseToFormValues(baseRuleResponse);

      expect(result.stateTransition).toEqual({
        pendingCount: null,
        pendingTimeframe: null,
        recoveringCount: null,
        recoveringTimeframe: null,
      });
      expect(result.stateTransitionAlertDelayMode).toBe('immediate');
      expect(result.stateTransitionRecoveryDelayMode).toBe('immediate');
    });

    it('widens no_data from the rule response', () => {
      const rule = {
        ...baseRuleResponse,
        no_data: { strategy: noDataStrategy.keep_last },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.noData).toEqual({ strategy: 'keep_last' });
    });

    it('carries the no_data presence query into form state', () => {
      const rule = {
        ...baseRuleResponse,
        no_data: { strategy: noDataStrategy.alert, query: 'FROM logs-* | LIMIT 1' },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.noData).toEqual({ strategy: 'alert', query: 'FROM logs-* | LIMIT 1' });
    });

    it('maps the ignore strategy through unchanged', () => {
      const rule = {
        ...baseRuleResponse,
        no_data: { strategy: noDataStrategy.ignore },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.noData).toEqual({ strategy: 'ignore' });
    });

    it('leaves noData undefined for signal rules, which carry no no_data block', () => {
      const rule = { ...baseRuleResponse, kind: 'signal' } as RuleResponse;
      const result = mapRuleResponseToFormValues(rule);

      expect(result.noData).toBeUndefined();
    });

    it('treats pending and recovering counts of 0 as immediate mode', () => {
      const rule = {
        ...baseRuleResponse,
        state_transition: { pending: { count: 0 }, recovering: { count: 0 } },
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.stateTransition).toEqual({
        pendingCount: 0,
        pendingTimeframe: null,
        recoveringCount: 0,
        recoveringTimeframe: null,
      });
      expect(result.stateTransitionAlertDelayMode).toBe('immediate');
      expect(result.stateTransitionRecoveryDelayMode).toBe('immediate');
    });

    it('splits artifacts by field ownership when present', () => {
      const rule = {
        ...baseRuleResponse,
        artifacts: [
          { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
          { id: 'runbook-id', type: 'runbook', data: { content: 'Runbook from API' } },
          { id: 'dashboard-id', type: 'dashboard', data: { dashboard_id: 'dashboard-123' } },
        ],
      } as RuleResponse;

      const result = mapRuleResponseToFormValues(rule);

      expect(result.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
      ]);
      expect(result.runbookArtifacts).toEqual([
        { id: 'runbook-id', type: 'runbook', data: { content: 'Runbook from API' } },
      ]);
      expect(result.dashboardArtifacts).toEqual([
        { id: 'dashboard-id', type: 'dashboard', data: { dashboard_id: 'dashboard-123' } },
      ]);
    });

    it('roundtrips: create request from mapped response matches original API payload', () => {
      const fullRule = {
        ...baseRuleResponse,
        metadata: { ...baseRuleResponse.metadata, description: 'Roundtrip description' },
        grouping: { fields: ['host.name'] },
        state_transition: { pending: { count: 3, timeframe: '10m' } },
        recovery: { strategy: recoveryStrategy.no_breach },
        no_data: { strategy: noDataStrategy.keep_last },
      } as RuleResponse;

      const formValues = mapRuleResponseToFormValues(fullRule);

      // Fill in required fields that mapRuleResponseToFormValues returns
      const completeFormValues: FormValues = {
        kind: formValues.kind!,
        metadata: formValues.metadata!,
        timeField: formValues.timeField!,
        schedule: formValues.schedule as FormValues['schedule'],
        query: formValues.query!,
        recovery: formValues.recovery,
        noData: formValues.noData,
        grouping: formValues.grouping,
        stateTransition: formValues.stateTransition,
        stateTransitionAlertDelayMode: formValues.stateTransitionAlertDelayMode!,
        stateTransitionRecoveryDelayMode: formValues.stateTransitionRecoveryDelayMode!,
        artifacts: formValues.artifacts,
        runbookArtifacts: formValues.runbookArtifacts,
        dashboardArtifacts: formValues.dashboardArtifacts,
      };

      const createPayload = mapFormValuesToCreateRequest(completeFormValues);

      expect(createPayload.kind).toBe('alert');
      expect(createPayload.metadata.description).toBe('Roundtrip description');
      expect(createPayload.query).toEqual({ base: 'FROM logs-* | STATS count() BY host' });
      expect(createPayload.grouping).toEqual({ fields: ['host.name'] });
      expect(createPayload.recovery).toEqual({ strategy: 'no_breach' });
      expect(createPayload.no_data).toEqual({ strategy: 'keep_last' });
      expect(createPayload.state_transition).toEqual({
        pending: { count: 3, timeframe: '10m' },
        recovering: { count: 0 },
      });
    });
  });
});
