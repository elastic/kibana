/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, uniq } from 'lodash';
import {
  EMPTY_DASHBOARD_STATE,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { hasWrittenDashboard } from '../extract_dashboard';
import { noDashboardResult, scoreChecks, skippedResult, type Check } from '../evaluator_utils';
import type { DashboardAgentEvaluator, SettingsGold } from '../types';

export const DASHBOARD_SETTINGS_EVALUATOR_NAME = 'Dashboard Settings';

type Settings = Record<string, unknown>;

const toOptionSettings = (options: object): Settings =>
  Object.fromEntries(Object.entries(options).map(([key, value]) => [`options.${key}`, value]));

/**
 * The settings the dashboard applies, by name. Unset options take the defaults the dashboard
 * merges them over, and unset fast mode is off.
 */
const getSettings = ({
  options,
  refresh_interval: refreshInterval,
  esql_approximation: esqlApproximation,
}: DashboardAttachmentData): Settings => ({
  ...toOptionSettings({ ...EMPTY_DASHBOARD_STATE.options, ...options }),
  refresh_interval: refreshInterval,
  esql_approximation: esqlApproximation ?? false,
});

const getGoldSettings = ({
  options = {},
  refreshInterval,
  esqlApproximation,
}: SettingsGold): Settings => ({
  ...toOptionSettings(options),
  ...(refreshInterval ? { refresh_interval: refreshInterval } : {}),
  ...(esqlApproximation !== undefined ? { esql_approximation: esqlApproximation } : {}),
});

const formatValue = (value: unknown): string => JSON.stringify(value) ?? 'unset';

const getSettingsChecks = (
  gold: SettingsGold,
  seed: DashboardAttachmentData,
  dashboard: DashboardAttachmentData
): Check[] => {
  const seedSettings = getSettings(seed);
  const resultSettings = getSettings(dashboard);
  const goldSettings = getGoldSettings(gold);
  const changed = uniq([...Object.keys(seedSettings), ...Object.keys(resultSettings)]).filter(
    (name) => !(name in goldSettings) && !isEqual(seedSettings[name], resultSettings[name])
  );
  return [
    ...Object.entries(goldSettings).map(([name, value]) => ({
      assertion: name,
      passed: isEqual(resultSettings[name], value),
      detail: `expected ${formatValue(value)}, found ${formatValue(resultSettings[name])}`,
    })),
    {
      assertion: 'other settings',
      passed: changed.length === 0,
      detail: `changed ${changed
        .map((name) => `${name} to ${formatValue(resultSettings[name])}`)
        .join(', ')}`,
    },
  ];
};

/**
 * Checks that the dashboard settings the prompt asks for are set, and that every other setting
 * keeps its seed value. The time range is left out: the default time range step may fill it.
 */
export const dashboardSettingsEvaluator: DashboardAgentEvaluator = {
  name: DASHBOARD_SETTINGS_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const gold = expected?.settings;
    if (!gold) {
      return skippedResult('No settings gold.');
    }
    const { before, dashboard } = output;
    // Without a write the result is the seed itself, which would keep every setting trivially.
    if (!dashboard || !hasWrittenDashboard(output)) {
      return noDashboardResult;
    }
    if (!before) {
      return skippedResult('The seeded dashboard was not read back.');
    }
    return scoreChecks(getSettingsChecks(gold, before, dashboard), {
      subject: 'settings',
      passLabel: 'match',
    });
  },
};
