/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { API_USAGE_COUNTER_TYPE, API_USAGE_ERROR_TYPE } from '../../common/constants';

/**
 * Helper function to help with understanding the usage of the intercept across clients
 */
export function getCounters(usageCollector?: UsageCounter) {
  return {
    usageCounter(counterName: string) {
      usageCollector?.incrementCounter({
        counterName,
        counterType: API_USAGE_COUNTER_TYPE,
      });
    },

    errorCounter(counterName: string) {
      usageCollector?.incrementCounter({
        counterName,
        counterType: API_USAGE_ERROR_TYPE,
      });
    },
  };
}

interface FormatPathInfoForCounterArgs {
  method: string;
  path: string;
  pathSuffix?: string;
  statusCode?: number;
}

export function formatPathInfoForCounter({
  method,
  path,
  pathSuffix,
  statusCode,
}: FormatPathInfoForCounterArgs) {
  const pathRequestInfo = [path];

  pathRequestInfo.push(pathSuffix ?? '');
  pathRequestInfo.push(statusCode ? String(statusCode) : '');

  return `${method} ${pathRequestInfo.join(':')}`;
}
