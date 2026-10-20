/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const parseStringToBoolean = (
  value: string | undefined,
  defaultValue?: boolean
): boolean => {
  if (!value) return defaultValue ?? false;

  switch (value.trim().toLowerCase()) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      return defaultValue ?? /true/i.test(value);
  }
};

export interface LogsScenarioOpts {
  isLogsDb: boolean;
}

import { getStringOpt } from '@kbn/synthtrace';

export const parseLogsScenarioOpts = (
  scenarioOpts: Record<string, unknown> | undefined
): LogsScenarioOpts => {
  const isLogsDb = parseStringToBoolean(getStringOpt(scenarioOpts, 'logsdb'));

  return {
    isLogsDb,
  };
};
