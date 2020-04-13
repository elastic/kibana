/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingConfig } from '../../types';

type timeoutConfig = [
  'capture',
  'timeouts',
  'openUrl' | 'waitForElements' | 'renderComplete' | 'timeBeforeTimeoutBreachHandler'
];

const reportingPath = 'xpack.reporting';
const queueTimeoutPath: ['queue', 'timeout'] = ['queue', 'timeout'];
const timeoutPaths: [
  ['capture', 'timeouts', 'openUrl'],
  ['capture', 'timeouts', 'waitForElements'],
  ['capture', 'timeouts', 'renderComplete'],
  ['capture', 'timeouts', 'timeBeforeTimeoutBreachHandler']
] = [
  ['capture', 'timeouts', 'openUrl'],
  ['capture', 'timeouts', 'waitForElements'],
  ['capture', 'timeouts', 'renderComplete'],
  ['capture', 'timeouts', 'timeBeforeTimeoutBreachHandler'],
];

export function validateTimeoutHandlers(config: ReportingConfig): void {
  const totalQueueTime = config.get(...queueTimeoutPath);

  return timeoutPaths
    .map((path: timeoutConfig) => [path.join('.'), config.get(...path)])
    .forEach(([timeoutPath, timeoutValue]) => {
      if (timeoutValue >= totalQueueTime) {
        throw new Error(
          `Timeout of "${timeoutValue}ms" for "${reportingPath}.${timeoutPath}" is greater than the overall timeout of "${totalQueueTime}"ms. Please set "${reportingPath}.${queueTimeoutPath.join(
            '.'
          )}" to a higher level, or decrease "${reportingPath}.${timeoutPath}" below ${totalQueueTime}`
        );
      }
    });
}
