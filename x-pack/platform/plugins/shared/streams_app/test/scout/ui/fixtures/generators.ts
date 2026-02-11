/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SynthtraceFixture } from '@kbn/scout';
import { log, timerange } from '@kbn/synthtrace-client';

export const DATE_RANGE = {
  from: 'Jan 1, 2025 @ 00:00:00.000',
  to: 'Jan 1, 2025 @ 01:00:00.000',
};

const TEST_START_TIME = '2025-01-01T00:00:00.000Z';
const TEST_END_TIME = '2025-01-01T01:00:00.000Z';
let logLevelToggle = true; // Toggle to switch between 'info' and 'warn' log levels
const getLogLevel = () => {
  logLevelToggle = !logLevelToggle;
  return logLevelToggle ? 'info' : 'warn';
};

export const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

/**
 * Generate synthetic logs data for testing
 */
export function generateLogsData(
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient']
) {
  return async ({
    index = 'logs',
    startTime = TEST_START_TIME,
    endTime = TEST_END_TIME,
    docsPerMinute = 10,
    isMalformed = false,
    defaults = {},
  }) => {
    const logsData = timerange(startTime, endTime)
      .interval('1m')
      .rate(docsPerMinute)
      .generator((timestamp) =>
        log
          .createForIndex(index)
          .message(`${new Date(timestamp).toISOString()} main Test log message`)
          .timestamp(timestamp)
          .logLevel(isMalformed ? MORE_THAN_1024_CHARS : getLogLevel())
          .setHostIp('127.0.0.1')
          .defaults({
            'service.name': 'test-service',
            ...defaults,
          })
      );

    await logsSynthtraceEsClient.index(logsData);
  };
}
