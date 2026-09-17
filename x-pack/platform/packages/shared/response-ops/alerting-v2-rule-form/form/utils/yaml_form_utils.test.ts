/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'yaml';
import { noDataStrategy, recoveryStrategy } from '@kbn/alerting-v2-schemas';
import {
  formValuesToYamlObject,
  parseYamlToFormValues,
  serializeFormToYaml,
} from './yaml_form_utils';
import { defaultTestFormValues } from '../../test_utils';
import type { FormValues } from '../types';

describe('yaml_form_utils', () => {
  describe('formValuesToYamlObject', () => {
    it('converts FormValues to a YAML-compatible object with snake_case keys', () => {
      const formValues: FormValues = {
        kind: 'alert',
        metadata: {
          name: 'Test Rule',
          enabled: true,
          description: 'A test rule',
          owner: 'test-owner',
          tags: ['label1', 'label2'],
        },
        timeField: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
        query: {
          base: 'FROM logs-* | LIMIT 10',
          breach: { segment: '' },
        },
        grouping: {
          fields: ['host.name', 'service.name'],
        },
        artifacts: [{ id: 'artifact-1', type: 'host', data: { value: 'host-a' } }],
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).toEqual({
        kind: 'alert',
        metadata: {
          name: 'Test Rule',
          description: 'A test rule',
          owner: 'test-owner',
          tags: ['label1', 'label2'],
        },
        time_field: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
        query: {
          base: 'FROM logs-* | LIMIT 10',
        },
        grouping: {
          fields: ['host.name', 'service.name'],
        },
        artifacts: [{ id: 'artifact-1', type: 'host', data: { value: 'host-a' } }],
      });
    });

    it('keeps the breach segment and emits the condition recovery block', () => {
      const formValues: FormValues = {
        ...defaultTestFormValues,
        query: {
          base: 'FROM logs-* | STATS c = COUNT(*) BY host.name',
          breach: { segment: 'WHERE c > 100' },
        },
        recovery: { strategy: recoveryStrategy.condition, segment: 'WHERE c < 50' },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result.query).toEqual({
        base: 'FROM logs-* | STATS c = COUNT(*) BY host.name',
        breach: { segment: 'WHERE c > 100' },
      });
      expect(result.recovery).toEqual({ strategy: 'condition', segment: 'WHERE c < 50' });
    });

    it('excludes optional fields when not provided', () => {
      const formValues: FormValues = {
        kind: 'signal',
        metadata: {
          name: 'Minimal Rule',
          enabled: false,
        },
        timeField: '@timestamp',
        schedule: {
          every: '1m',
          lookback: '5m',
        },
        query: {
          base: 'FROM logs-*',
          breach: { segment: '' },
        },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).toEqual({
        kind: 'signal',
        metadata: {
          name: 'Minimal Rule',
        },
        time_field: '@timestamp',
        schedule: {
          every: '1m',
          lookback: '5m',
        },
        query: {
          base: 'FROM logs-*',
        },
      });
      expect(result).not.toHaveProperty('grouping');
      expect((result.metadata as Record<string, unknown>).description).toBeUndefined();
    });

    it('serializes state_transition as nested pending and recovering blocks', () => {
      const formValues: FormValues = {
        ...defaultTestFormValues,
        stateTransition: { pendingCount: 3, recoveringCount: 1 },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result.state_transition).toEqual({
        pending: { count: 3 },
        recovering: { count: 1 },
      });
    });

    it('excludes state_transition when not present', () => {
      const formValues: FormValues = { ...defaultTestFormValues };

      const result = formValuesToYamlObject(formValues);

      expect(result).not.toHaveProperty('state_transition');
    });

    it('excludes state_transition for signal even when form state still holds it', () => {
      const formValues: FormValues = {
        ...defaultTestFormValues,
        kind: 'signal',
        stateTransition: { pendingCount: 3, recoveringCount: 1 },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).not.toHaveProperty('state_transition');
    });

    it('excludes empty grouping fields array', () => {
      const formValues: FormValues = {
        ...defaultTestFormValues,
        grouping: { fields: [] },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).not.toHaveProperty('grouping');
    });

    it('drops the breach block when the segment is blank', () => {
      const formValues: FormValues = {
        ...defaultTestFormValues,
        query: { base: 'FROM logs-*', breach: { segment: '   ' } },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result.query).toEqual({ base: 'FROM logs-*' });
    });

    it('includes no_data when set', () => {
      const formValues: FormValues = {
        ...defaultTestFormValues,
        noData: { strategy: noDataStrategy.resolve },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result.no_data).toEqual({ strategy: 'resolve' });
    });

    it('excludes no_data when undefined', () => {
      const result = formValuesToYamlObject(defaultTestFormValues);

      expect(result).not.toHaveProperty('no_data');
    });

    it('excludes recovery and no_data for signal rules', () => {
      const formValues: FormValues = {
        ...defaultTestFormValues,
        kind: 'signal',
        recovery: { strategy: recoveryStrategy.no_breach },
        noData: { strategy: noDataStrategy.resolve },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).not.toHaveProperty('recovery');
      expect(result).not.toHaveProperty('no_data');
    });
  });

  describe('parseYamlToFormValues', () => {
    it('parses valid YAML to FormValues', () => {
      const yaml = stringify({
        kind: 'alert',
        metadata: {
          name: 'Test Rule',
          enabled: true,
          description: 'A description',
        },
        time_field: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
        query: {
          base: 'FROM logs-*',
        },
        grouping: {
          fields: ['host.name'],
        },
        artifacts: [
          { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
          { id: 'artifact-2', type: 'service', data: { value: 'service-a' } },
        ],
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values).toEqual(
        expect.objectContaining({
          kind: 'alert',
          metadata: {
            name: 'Test Rule',
            enabled: true,
            description: 'A description',
            owner: undefined,
            tags: undefined,
          },
          timeField: '@timestamp',
          schedule: {
            every: '5m',
            lookback: '1m',
          },
          query: {
            base: 'FROM logs-*',
            breach: { segment: '' },
          },
          noData: { strategy: 'ignore' },
          grouping: {
            fields: ['host.name'],
          },
          artifacts: [
            { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
            { id: 'artifact-2', type: 'service', data: { value: 'service-a' } },
          ],
          stateTransitionAlertDelayMode: 'immediate',
          stateTransitionRecoveryDelayMode: 'immediate',
        })
      );
    });

    it('parses a query with a breach segment', () => {
      const yaml = stringify({
        kind: 'alert',
        metadata: { name: 'Split Rule' },
        query: {
          base: 'FROM logs-* | STATS c = COUNT(*) BY host.name',
          breach: { segment: 'WHERE c > 100' },
        },
        recovery: { strategy: 'condition', segment: 'WHERE c < 50' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.query).toEqual({
        base: 'FROM logs-* | STATS c = COUNT(*) BY host.name',
        breach: { segment: 'WHERE c > 100' },
      });
      expect(result.values?.recovery).toEqual({ strategy: 'condition', segment: 'WHERE c < 50' });
    });

    it('accepts a bare string breach for backward compatibility', () => {
      const yaml = stringify({
        metadata: { name: 'Bare string' },
        query: {
          base: 'FROM logs-*',
          breach: 'WHERE c > 100',
        },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.query).toEqual({
        base: 'FROM logs-*',
        breach: { segment: 'WHERE c > 100' },
      });
    });

    it('parses no_data from YAML', () => {
      const yaml = stringify({
        kind: 'alert',
        metadata: { name: 'No data rule' },
        query: { base: 'FROM logs-*' },
        no_data: { strategy: 'resolve', query: 'FROM logs-* | LIMIT 1' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.noData).toEqual({
        strategy: 'resolve',
        query: 'FROM logs-* | LIMIT 1',
      });
    });

    it('defaults an invalid no_data strategy to ignore for alert rules', () => {
      const yaml = stringify({
        kind: 'alert',
        metadata: { name: 'Invalid strategy' },
        query: { base: 'FROM logs-*' },
        no_data: { strategy: 'invalid_value' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.noData).toEqual({ strategy: 'ignore' });
    });

    it('defaults noData to ignore for alert rules when absent from YAML', () => {
      const yaml = stringify({
        kind: 'alert',
        metadata: { name: 'No strategy' },
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.noData).toEqual({ strategy: 'ignore' });
    });

    it('defaults recovery to no_breach for alert rules when absent from YAML', () => {
      const yaml = stringify({
        kind: 'alert',
        metadata: { name: 'No recovery' },
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.recovery).toEqual({ strategy: 'no_breach' });
    });

    it('leaves recovery and noData undefined for signal rules, which cannot carry them', () => {
      const yaml = stringify({
        kind: 'signal',
        metadata: { name: 'Signal rule' },
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.recovery).toBeUndefined();
      expect(result.values?.noData).toBeUndefined();
    });

    it('ignores invalid artifacts entries', () => {
      const yaml = stringify({
        metadata: { name: 'Rule with mixed artifacts' },
        query: { base: 'FROM logs-*' },
        artifacts: [
          { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
          { id: 1 },
          'bad',
        ],
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', data: { value: 'host-a' } },
      ]);
    });

    it('returns error for invalid YAML syntax', () => {
      const invalidYaml = 'kind: alert\n  invalid: indentation';

      const result = parseYamlToFormValues(invalidYaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('Invalid YAML syntax');
    });

    it('returns error for non-object YAML', () => {
      const arrayYaml = '- item1\n- item2';

      const result = parseYamlToFormValues(arrayYaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('YAML must be an object');
    });

    it('returns error for invalid kind value', () => {
      const yaml = stringify({
        kind: 'invalid',
        metadata: { name: 'Test' },
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('Kind must be "alert" or "signal"');
    });

    it('returns values with empty name when metadata.name is missing', () => {
      const yaml = stringify({
        kind: 'alert',
        metadata: {},
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.metadata.name).toBe('');
    });

    it('returns values with trimmed empty name when name is whitespace', () => {
      const yaml = stringify({
        kind: 'alert',
        metadata: { name: '   ' },
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.metadata.name).toBe('');
    });

    it('returns values with empty query when query is missing', () => {
      const yaml = stringify({
        kind: 'alert',
        metadata: { name: 'Test' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.query).toEqual({ base: '', breach: { segment: '' } });
    });

    it('returns values for ES|QL query without validation', () => {
      const yaml = stringify({
        kind: 'alert',
        metadata: { name: 'Test' },
        query: { base: 'INVALID query' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.query.base).toBe('INVALID query');
    });

    it('uses default values for missing optional fields', () => {
      const yaml = stringify({
        metadata: { name: 'Minimal Rule' },
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values).toMatchObject({
        kind: 'alert',
        timeField: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
      });
    });

    it('defaults enabled to true when not specified', () => {
      const yaml = stringify({
        metadata: { name: 'Test' },
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values?.metadata.enabled).toBe(true);
    });

    it('respects enabled: false', () => {
      const yaml = stringify({
        metadata: { name: 'Test', enabled: false },
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values?.metadata.enabled).toBe(false);
    });

    it('trims whitespace from name', () => {
      const yaml = stringify({
        metadata: { name: '  Test Rule  ' },
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values?.metadata.name).toBe('Test Rule');
    });

    it('derives breaches alert delay mode from state_transition.pending.count', () => {
      const yaml = stringify({
        metadata: { name: 'Rule with breaches' },
        query: { base: 'FROM logs-*' },
        state_transition: { pending: { count: 3 } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.stateTransition).toEqual({
        pendingCount: 3,
        pendingTimeframe: null,
        recoveringCount: null,
        recoveringTimeframe: null,
      });
      expect(result.values?.stateTransitionAlertDelayMode).toBe('breaches');
      expect(result.values?.stateTransitionRecoveryDelayMode).toBe('immediate');
    });

    it('derives duration alert delay mode from state_transition.pending.timeframe', () => {
      const yaml = stringify({
        metadata: { name: 'Rule with duration' },
        query: { base: 'FROM logs-*' },
        state_transition: { pending: { timeframe: '10m' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.stateTransitionAlertDelayMode).toBe('duration');
      expect(result.values?.stateTransitionRecoveryDelayMode).toBe('immediate');
    });

    it('derives both delay modes from state_transition pending and recovering blocks', () => {
      const yaml = stringify({
        metadata: { name: 'Rule with both' },
        query: { base: 'FROM logs-*' },
        state_transition: {
          pending: { count: 2 },
          recovering: { timeframe: '15m' },
        },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.stateTransition).toEqual({
        pendingCount: 2,
        pendingTimeframe: null,
        recoveringCount: null,
        recoveringTimeframe: '15m',
      });
      expect(result.values?.stateTransitionAlertDelayMode).toBe('breaches');
      expect(result.values?.stateTransitionRecoveryDelayMode).toBe('duration');
    });

    it('defaults both modes to immediate when no state_transition is present', () => {
      const yaml = stringify({
        metadata: { name: 'No delay' },
        query: { base: 'FROM logs-*' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.stateTransition).toBeUndefined();
      expect(result.values?.stateTransitionAlertDelayMode).toBe('immediate');
      expect(result.values?.stateTransitionRecoveryDelayMode).toBe('immediate');
    });
  });

  describe('serializeFormToYaml', () => {
    it('serializes FormValues to YAML string', () => {
      const formValues: FormValues = {
        kind: 'alert',
        metadata: {
          name: 'Test',
          enabled: true,
        },
        timeField: '@timestamp',
        schedule: { every: '5m', lookback: '1m' },
        query: { base: 'FROM logs-*', breach: { segment: '' } },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      };

      const yaml = serializeFormToYaml(formValues);

      expect(yaml).toContain('kind: alert');
      expect(yaml).toContain('name: Test');
      expect(yaml).toContain("time_field: '@timestamp'");
    });
  });

  describe('round-trip stability', () => {
    it('parse(serialize(values)) preserves the same FormValues structure', () => {
      const original: FormValues = {
        kind: 'alert',
        metadata: { name: 'Round-trip rule', enabled: true, description: 'desc' },
        timeField: '@timestamp',
        schedule: { every: '5m', lookback: '10m' },
        query: {
          base: 'FROM logs-* | STATS count = COUNT(*) BY host.name | WHERE count > 5',
          breach: { segment: '' },
        },
        stateTransition: { pendingCount: 2, recoveringCount: 2 },
        stateTransitionAlertDelayMode: 'breaches',
        stateTransitionRecoveryDelayMode: 'recoveries',
      };

      const yaml = serializeFormToYaml(original);
      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values).toBeDefined();
      expect(result.values?.kind).toBe(original.kind);
      expect(result.values?.metadata.name).toBe(original.metadata.name);
      expect(result.values?.timeField).toBe(original.timeField);
      expect(result.values?.query).toEqual(original.query);
      expect(result.values?.schedule.every).toBe(original.schedule.every);
      expect(result.values?.schedule.lookback).toBe(original.schedule.lookback);
      expect(result.values?.stateTransition?.pendingCount).toBe(
        original.stateTransition?.pendingCount
      );
      expect(result.values?.stateTransition?.recoveringCount).toBe(
        original.stateTransition?.recoveringCount
      );
    });

    it('parse(serialize(values)) preserves a breach segment', () => {
      const original: FormValues = {
        kind: 'alert',
        metadata: { name: 'Split round-trip', enabled: true },
        timeField: '@timestamp',
        schedule: { every: '1m', lookback: '5m' },
        query: {
          base: 'FROM logs-* | STATS c = COUNT(*) BY host.name',
          breach: { segment: 'WHERE c > 100' },
        },
        recovery: { strategy: recoveryStrategy.condition, segment: 'WHERE c < 50' },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      };

      const yaml = serializeFormToYaml(original);
      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.query).toEqual(original.query);
      expect(result.values?.recovery).toEqual(
        expect.objectContaining({ strategy: 'condition', segment: 'WHERE c < 50' })
      );
    });

    it('parse(serialize(values)) preserves recovery.strategy: no_breach', () => {
      const original: FormValues = {
        kind: 'alert',
        metadata: { name: 'No-breach recovery', enabled: true },
        timeField: '@timestamp',
        schedule: { every: '5m', lookback: '1m' },
        query: {
          base: 'FROM logs-*',
          breach: { segment: 'WHERE c > 100' },
        },
        recovery: { strategy: recoveryStrategy.no_breach },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      };

      const yaml = serializeFormToYaml(original);
      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.recovery?.strategy).toBe('no_breach');
    });

    it('parse(serialize(values)) preserves no_data with its presence query', () => {
      const original: FormValues = {
        kind: 'alert',
        metadata: { name: 'No-data resolve', enabled: true },
        timeField: '@timestamp',
        schedule: { every: '5m', lookback: '1m' },
        query: {
          base: 'FROM logs-* | WHERE level == "error"',
          breach: { segment: '' },
        },
        recovery: {
          strategy: recoveryStrategy.query,
          query: 'FROM logs-* | WHERE level != "error"',
        },
        noData: { strategy: noDataStrategy.resolve, query: 'FROM logs-* | STATS c = COUNT(*)' },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      };

      const yaml = serializeFormToYaml(original);
      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.query).toEqual(original.query);
      expect(result.values?.recovery).toEqual(
        expect.objectContaining({
          strategy: 'query',
          query: 'FROM logs-* | WHERE level != "error"',
        })
      );
      expect(result.values?.noData).toEqual({
        strategy: 'resolve',
        query: 'FROM logs-* | STATS c = COUNT(*)',
      });
    });

    it('parse(serialize(values)) preserves recovery.strategy: manual', () => {
      const original: FormValues = {
        kind: 'alert',
        metadata: { name: 'Manual recovery', enabled: true },
        timeField: '@timestamp',
        schedule: { every: '5m', lookback: '1m' },
        query: {
          base: 'FROM logs-*',
          breach: { segment: 'WHERE c > 100' },
        },
        recovery: { strategy: recoveryStrategy.manual },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      };

      const yaml = serializeFormToYaml(original);
      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.recovery?.strategy).toBe('manual');
    });
  });
});
