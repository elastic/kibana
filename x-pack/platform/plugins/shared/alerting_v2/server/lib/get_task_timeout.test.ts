/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTaskTimeout } from './get_task_timeout';
import type { PluginConfig } from '../config';
import type {
  AlertingTaskDefinition,
  AlertingTaskRunner,
} from './services/task_run_scope_service/create_task_runner';
import {
  ALERTING_RULE_EXECUTOR_TASK_TYPE,
  DEFAULT_ALERTING_RULE_EXECUTOR_TASK_TIMEOUT,
} from './rule_executor/constants';

const buildConfig = (timeout?: string): PluginConfig =>
  ({
    rules: {
      run: {
        alerts: { max: 1000 },
        timeout,
      },
    },
  } as PluginConfig);

const buildDefinition = (
  overrides: Partial<AlertingTaskDefinition<AlertingTaskRunner>> = {}
): AlertingTaskDefinition<AlertingTaskRunner> =>
  ({
    taskType: ALERTING_RULE_EXECUTOR_TASK_TYPE,
    title: 'test task',
    timeout: '5m',
    ...overrides,
  } as AlertingTaskDefinition<AlertingTaskRunner>);

describe('getTaskTimeout', () => {
  describe('for the rule executor task', () => {
    test('returns the configured timeout when set', () => {
      const config = buildConfig('10m');
      const definition = buildDefinition();

      expect(getTaskTimeout(config, definition)).toBe('10m');
    });

    test('falls back to the definition timeout when config timeout is unset', () => {
      const config = buildConfig(undefined);
      const definition = buildDefinition({ timeout: '15m' });

      expect(getTaskTimeout(config, definition)).toBe('15m');
    });

    test('falls back to the default timeout when neither config nor definition is set', () => {
      const config = buildConfig(undefined);
      const definition = buildDefinition({ timeout: undefined as unknown as string });

      expect(getTaskTimeout(config, definition)).toBe(DEFAULT_ALERTING_RULE_EXECUTOR_TASK_TIMEOUT);
    });
  });

  describe('for other task types', () => {
    test('returns the definition timeout, ignoring the configured rule run timeout', () => {
      const config = buildConfig('10m');
      const definition = buildDefinition({ taskType: 'alerting_v2:dispatcher', timeout: '1m' });

      expect(getTaskTimeout(config, definition)).toBe('1m');
    });
  });
});
