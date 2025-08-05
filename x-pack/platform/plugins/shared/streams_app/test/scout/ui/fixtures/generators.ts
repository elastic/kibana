/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SynthtraceFixture } from '@kbn/scout';
import { log, timerange } from '@kbn/apm-synthtrace-client';

export const DATE_RANGE = {
  from: 'Jan 1, 2024 @ 00:00:00.000',
  to: 'Jan 1, 2024 @ 01:00:00.000',
};

const TEST_START_TIME = '2024-01-01T00:00:00.000Z';
const TEST_END_TIME = '2024-01-01T01:00:00.000Z';
let logLevelToggle = true; // Toggle to switch between 'info' and 'warn' log levels
const getLogLevel = () => {
  logLevelToggle = !logLevelToggle;
  return logLevelToggle ? 'info' : 'warn';
};

/**
 * Generate synthetic logs data for testing
 */
export function generateLogsData(
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient']
) {
  return async ({ index = 'logs' }) => {
    const logsData = timerange(TEST_START_TIME, TEST_END_TIME)
      .interval('1m')
      .rate(10)
      .generator((timestamp) =>
        log
          .createForIndex(index)
          .message('Test log message')
          .timestamp(timestamp)
          .logLevel(getLogLevel())
          .defaults({
            'service.name': 'test-service',
          })
      );

    await logsSynthtraceEsClient.index(logsData);
  };
}
