/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump } from 'js-yaml';
import {
  formValuesToYamlObject,
  parseYamlToFormValues,
  serializeFormToYaml,
} from './yaml_form_utils';
import { defaultTestFormValues } from '../../test_utils';
import type { FormValues } from '../types';

// Mock ES|QL validation
jest.mock('@kbn/alerting-v2-schemas', () => ({
  validateEsqlQuery: (query: string) => {
    if (!query || query.includes('INVALID')) {
      return 'Invalid ES|QL query syntax';
    }
    return null;
  },
}));

describe('yaml_form_utils', () => {
  describe('formValuesToYamlObject', () => {
    it('converts FormValues to YAML-compatible object with snake_case keys', () => {
      const formValues: FormValues = {
        kind: 'alert',
        metadata: {
          name: 'Test Rule',
          enabled: true,
          description: 'A test rule',
          owner: 'test-owner',
          labels: ['label1', 'label2'],
        },
        timeField: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
        evaluation: {
          query: {
            base: 'FROM logs-* | LIMIT 10',
          },
        },
        grouping: {
          fields: ['host.name', 'service.name'],
        },
        artifacts: [{ id: 'artifact-1', type: 'host', value: 'host-a' }],
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).toEqual({
        kind: 'alert',
        metadata: {
          name: 'Test Rule',
          enabled: true,
          description: 'A test rule',
          owner: 'test-owner',
          labels: ['label1', 'label2'],
        },
        time_field: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
        evaluation: {
          query: {
            base: 'FROM logs-* | LIMIT 10',
          },
        },
        grouping: {
          fields: ['host.name', 'service.name'],
        },
        artifacts: [{ id: 'artifact-1', type: 'host', value: 'host-a' }],
      });
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
        evaluation: {
          query: {
            base: 'FROM logs-*',
          },
        },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).toEqual({
        kind: 'signal',
        metadata: {
          name: 'Minimal Rule',
          enabled: false,
        },
        time_field: '@timestamp',
        schedule: {
          every: '1m',
          lookback: '5m',
        },
        evaluation: {
          query: {
            base: 'FROM logs-*',
          },
        },
      });
      expect(result).not.toHaveProperty('grouping');
      expect((result.metadata as Record<string, unknown>).description).toBeUndefined();
    });

    it('excludes empty grouping fields array', () => {
      const formValues: FormValues = {
        ...defaultTestFormValues,
        grouping: {
          fields: [],
        },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).not.toHaveProperty('grouping');
    });
  });

  describe('parseYamlToFormValues', () => {
    it('parses valid YAML to FormValues', () => {
      const yaml = dump({
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
        evaluation: {
          query: {
            base: 'FROM logs-*',
          },
        },
        grouping: {
          fields: ['host.name'],
        },
        artifacts: [
          { id: 'artifact-1', type: 'host', value: 'host-a' },
          { id: 'artifact-2', type: 'service', value: 'service-a' },
        ],
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values).toEqual({
        kind: 'alert',
        metadata: {
          name: 'Test Rule',
          enabled: true,
          description: 'A description',
          owner: undefined,
          labels: undefined,
        },
        timeField: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
        evaluation: {
          query: {
            base: 'FROM logs-*',
          },
        },
        grouping: {
          fields: ['host.name'],
        },
        artifacts: [
          { id: 'artifact-1', type: 'host', value: 'host-a' },
          { id: 'artifact-2', type: 'service', value: 'service-a' },
        ],
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      });
    });

    it('ignores invalid artifacts entries', () => {
      const yaml = dump({
        metadata: { name: 'Rule with mixed artifacts' },
        evaluation: { query: { base: 'FROM logs-*' } },
        artifacts: [{ id: 'artifact-1', type: 'host', value: 'host-a' }, { id: 1 }, 'bad'],
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.artifacts).toEqual([
        { id: 'artifact-1', type: 'host', value: 'host-a' },
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
      const yaml = dump({
        kind: 'invalid',
        metadata: { name: 'Test' },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('Kind must be "alert" or "signal"');
    });

    it('returns error for missing name', () => {
      const yaml = dump({
        kind: 'alert',
        metadata: {},
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('metadata.name is required');
    });

    it('returns error for empty name', () => {
      const yaml = dump({
        kind: 'alert',
        metadata: { name: '   ' },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('metadata.name is required');
    });

    it('returns error for missing query', () => {
      const yaml = dump({
        kind: 'alert',
        metadata: { name: 'Test' },
        evaluation: { query: {} },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('evaluation.query.base is required');
    });

    it('returns error for invalid ES|QL query', () => {
      const yaml = dump({
        kind: 'alert',
        metadata: { name: 'Test' },
        evaluation: { query: { base: 'INVALID query' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('Invalid ES|QL query syntax');
    });

    it('uses default values for missing optional fields', () => {
      const yaml = dump({
        metadata: { name: 'Minimal Rule' },
        evaluation: { query: { base: 'FROM logs-*' } },
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
      const yaml = dump({
        metadata: { name: 'Test' },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values?.metadata.enabled).toBe(true);
    });

    it('respects enabled: false', () => {
      const yaml = dump({
        metadata: { name: 'Test', enabled: false },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values?.metadata.enabled).toBe(false);
    });

    it('trims whitespace from name', () => {
      const yaml = dump({
        metadata: { name: '  Test Rule  ' },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values?.metadata.name).toBe('Test Rule');
    });

    it('derives breaches alert delay mode from state_transition with pending_count', () => {
      const yaml = dump({
        metadata: { name: 'Rule with breaches' },
        evaluation: { query: { base: 'FROM logs-*' } },
        state_transition: { pending_count: 3 },
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

    it('derives duration alert delay mode from state_transition with pending_timeframe', () => {
      const yaml = dump({
        metadata: { name: 'Rule with duration' },
        evaluation: { query: { base: 'FROM logs-*' } },
        state_transition: { pending_timeframe: '10m' },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values?.stateTransitionAlertDelayMode).toBe('duration');
      expect(result.values?.stateTransitionRecoveryDelayMode).toBe('immediate');
    });

    it('derives both delay modes from state_transition with pending and recovering fields', () => {
      const yaml = dump({
        metadata: { name: 'Rule with both' },
        evaluation: { query: { base: 'FROM logs-*' } },
        state_transition: {
          pending_count: 2,
          recovering_timeframe: '15m',
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
      const yaml = dump({
        metadata: { name: 'No delay' },
        evaluation: { query: { base: 'FROM logs-*' } },
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
        evaluation: { query: { base: 'FROM logs-*' } },
        stateTransitionAlertDelayMode: 'immediate',
        stateTransitionRecoveryDelayMode: 'immediate',
      };

      const yaml = serializeFormToYaml(formValues);

      expect(yaml).toContain('kind: alert');
      expect(yaml).toContain('name: Test');
      // js-yaml uses single quotes for strings containing special characters
      expect(yaml).toContain("time_field: '@timestamp'");
    });
  });
});
