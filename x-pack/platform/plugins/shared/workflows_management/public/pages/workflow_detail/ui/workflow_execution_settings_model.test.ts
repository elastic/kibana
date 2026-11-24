/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  EMPTY_EXECUTION_SETTINGS,
  executionSettingsPatch,
  invalidExecutionSettings,
  readExecutionSettings,
  writeExecutionSettings,
} from './workflow_execution_settings_model';

const draftWith = (overrides: Partial<typeof EMPTY_EXECUTION_SETTINGS>) => ({
  ...EMPTY_EXECUTION_SETTINGS,
  ...overrides,
});

describe('workflow execution settings', () => {
  describe('readExecutionSettings', () => {
    it('reads the settings the form edits and ignores the others', () => {
      expect(
        readExecutionSettings({
          timeout: '20m',
          'max-step-size': '10mb',
          timezone: 'UTC',
          concurrency: { key: '{{ event.id }}', strategy: 'queue', max: 2, 'queue-size': 5 },
        })
      ).toEqual({
        timeout: '20m',
        maxStepSize: '10mb',
        concurrencyKey: '{{ event.id }}',
        concurrencyStrategy: 'queue',
        concurrencyMax: '2',
        queueSize: '5',
        queueTtl: '',
      });
    });

    it.each([undefined, null, 'text', 3, []])('is empty for %p', (settings) => {
      expect(readExecutionSettings(settings)).toEqual(EMPTY_EXECUTION_SETTINGS);
    });

    it('does not take a strategy the product does not know', () => {
      expect(readExecutionSettings({ concurrency: { strategy: 'wait' } }).concurrencyStrategy).toBe(
        ''
      );
    });
  });

  describe('invalidExecutionSettings', () => {
    it('accepts empty fields, which mean "not set"', () => {
      expect(invalidExecutionSettings(EMPTY_EXECUTION_SETTINGS).size).toBe(0);
    });

    it('accepts what the schema accepts', () => {
      expect(
        invalidExecutionSettings(
          draftWith({
            timeout: '1h30m',
            maxStepSize: '1.5gb',
            concurrencyMax: '3',
            queueSize: '10',
            queueTtl: '24h',
          })
        ).size
      ).toBe(0);
    });

    it('names the fields whose text is not valid yet', () => {
      expect(
        [
          ...invalidExecutionSettings(
            draftWith({
              timeout: 'soon',
              maxStepSize: '10',
              concurrencyMax: '0',
              queueSize: '2.5',
              queueTtl: 'long',
              concurrencyKey: 'k'.repeat(513),
            })
          ),
        ].sort()
      ).toEqual(
        [
          'concurrencyKey',
          'concurrencyMax',
          'maxStepSize',
          'queueSize',
          'queueTtl',
          'timeout',
        ].sort()
      );
    });
  });

  describe('executionSettingsPatch', () => {
    it('removes every setting for an empty draft', () => {
      expect(executionSettingsPatch(EMPTY_EXECUTION_SETTINGS)).toEqual({
        timeout: null,
        'max-step-size': null,
        concurrency: null,
      });
    });

    it('writes numbers as numbers and drops the queue settings of other strategies', () => {
      expect(
        executionSettingsPatch(
          draftWith({
            timeout: ' 20m ',
            concurrencyKey: 'case-{{ id }}',
            concurrencyStrategy: 'drop',
            concurrencyMax: '2',
            queueSize: '5',
            queueTtl: '1h',
          })
        )
      ).toEqual({
        timeout: '20m',
        'max-step-size': null,
        concurrency: { key: 'case-{{ id }}', strategy: 'drop', max: 2 },
      });
    });

    it('keeps the queue settings for the queue strategy', () => {
      expect(
        executionSettingsPatch(
          draftWith({ concurrencyStrategy: 'queue', queueSize: '5', queueTtl: '1h' })
        ).concurrency
      ).toEqual({ strategy: 'queue', 'queue-size': 5, 'queue-ttl': '1h' });
    });

    it('leaves out a setting whose text is not valid yet, so the document keeps its last value', () => {
      const patch = executionSettingsPatch(draftWith({ timeout: 'soon', maxStepSize: '5mb' }));

      expect(patch).not.toHaveProperty('timeout');
      expect(patch['max-step-size']).toBe('5mb');
    });

    it('leaves the whole concurrency out while one of its fields is not valid', () => {
      expect(executionSettingsPatch(draftWith({ concurrencyMax: '0' }))).not.toHaveProperty(
        'concurrency'
      );
    });
  });

  describe('writeExecutionSettings', () => {
    const BASE = 'version: "1"\nname: wf\ntriggers:\n  - type: manual\nsteps: []\n';

    it('adds a settings mapping when there is none', () => {
      const next = writeExecutionSettings(BASE, {
        timeout: '20m',
        concurrency: { key: 'k', strategy: 'drop', max: 1 },
      });

      expect(parse(next).settings).toEqual({
        timeout: '20m',
        concurrency: { key: 'k', strategy: 'drop', max: 1 },
      });
      expect(parse(next).name).toBe('wf');
    });

    it('keeps the settings the form does not edit', () => {
      const yaml = `${BASE}settings:\n  timezone: Europe/Rome\n  timeout: 5m\n`;

      expect(parse(writeExecutionSettings(yaml, { timeout: '1h' })).settings).toEqual({
        timezone: 'Europe/Rome',
        timeout: '1h',
      });
    });

    it('removes a setting, and the mapping once nothing is left in it', () => {
      const yaml = `${BASE}settings:\n  timeout: 5m\n`;
      const next = writeExecutionSettings(yaml, { timeout: null, concurrency: null });

      expect(next).not.toContain('settings');
      expect(parse(next).steps).toEqual([]);
    });

    it('replaces the concurrency as a whole', () => {
      const yaml = `${BASE}settings:\n  concurrency:\n    key: old\n    max: 3\n`;

      expect(
        parse(writeExecutionSettings(yaml, { concurrency: { strategy: 'drop' } })).settings
      ).toEqual({ concurrency: { strategy: 'drop' } });
    });

    it('returns the same text for an empty patch and for text that is not YAML', () => {
      expect(writeExecutionSettings(BASE, {})).toBe(BASE);
      expect(writeExecutionSettings('a: [', { timeout: '1m' })).toBe('a: [');
    });
  });
});
