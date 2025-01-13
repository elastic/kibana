/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  RuleType as BaseRuleType,
  RuleTypeState,
  RuleExecutorOptions as BaseRuleExecutorOptions,
  DEFAULT_AAD_CONFIG,
  AlertsClientError,
} from '@kbn/alerting-plugin/server';
import type { DefaultAlert } from '@kbn/alerts-as-data-utils';
import { RecoveredActionGroupId } from '@kbn/alerting-plugin/common';

type Params = TypeOf<typeof Params>;
const Params = schema.object(
  {
    patterns: schema.recordOf(schema.string(), schema.string()),
  },
  {
    validate({ patterns }) {
      try {
        buildPatterns(patterns);
      } catch (err) {
        return err.message;
      }
    },
  }
);

type Action = 'a' | '-'; // active, error, not active
interface InstancePattern {
  instance: string;
  patternIndex: number;
  pattern: Action[];
}

interface State extends RuleTypeState {
  patternParamJSON?: string;
  patterns?: InstancePattern[];
  runs?: number;
}

type RuleExecutorOptions = BaseRuleExecutorOptions<Params, State, {}, {}, 'default', DefaultAlert>;

type RuleType = BaseRuleType<
  Params,
  never,
  State,
  {},
  {},
  'default',
  RecoveredActionGroupId,
  DefaultAlert
>;
export const ruleType: RuleType = getPatternRuleType();

function getPatternRuleType(): RuleType {
  return {
    id: 'example.pattern',
    name: 'Example: Creates alerts on a pattern, for testing',
    actionGroups: [{ id: 'default', name: 'Default' }],
    category: 'kibana',
    producer: 'alertsFixture',
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor,
    alerts: DEFAULT_AAD_CONFIG,
    validate: {
      params: Params,
    },
  };
}

async function executor(options: RuleExecutorOptions): Promise<{ state: State }> {
  const { services, state, params } = options;
  const { alertsClient } = services;
  if (!alertsClient) {
    throw new AlertsClientError();
  }

  if (state.runs == null) {
    state.runs = 0;
  }
  state.runs++;

  // rebuild our patterns in state if the params change
  const patternParamJSON = JSON.stringify(params.patterns);
  if (state.patternParamJSON !== patternParamJSON) {
    state.patterns = undefined;
  }

  if (state.patterns == null) {
    state.patternParamJSON = patternParamJSON;
    state.patterns = buildPatterns(params.patterns);
  }

  const { patterns, runs } = state;

  for (const element of patterns) {
    const { instance, pattern, patternIndex } = element;
    const action = pattern[patternIndex];

    element.patternIndex++;
    if (element.patternIndex >= element.pattern.length) {
      element.patternIndex = 0;
    }

    switch (action) {
      case 'a':
        const context = { patternIndex, action, pattern, runs };
        alertsClient.report({ id: instance, actionGroup: 'default', context });
        break;
      case '-':
        break;
      default:
        options.logger.error(`invalid action "${action}" from instance ${instance}`);
    }
  }

  return {
    state: {
      patterns,
      patternParamJSON,
      runs,
    },
  };
}

function buildPatterns(stringPatterns: Record<string, string>): InstancePattern[] {
  const result: InstancePattern[] = [];
  const errors: string[] = [];

  for (const [instance, stringPattern] of Object.entries(stringPatterns)) {
    const pattern = getPatternFromString(instance, stringPattern, errors);
    result.push({ instance, pattern, patternIndex: 0 });
  }

  if (errors.length) {
    throw new Error(`errors in patterns: ${errors.join(', ')}`);
  }

  return result;
}

function getPatternFromString(instance: string, stringPattern: string, errors: string[]): Action[] {
  const result: Action[] = [];

  const runs = stringPattern.trim().split(/\s+/g);
  for (const run of runs) {
    switch (run) {
      case 'a':
        result.push('a');
        break;
      case '-':
        result.push('-');
        break;
      default:
        errors.push(`pattern for ${instance} contains invalid string: "${run}"`);
    }
  }

  return result;
}
