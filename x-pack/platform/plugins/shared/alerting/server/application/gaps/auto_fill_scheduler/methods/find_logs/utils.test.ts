/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IValidatedEventInternalDocInfo } from '@kbn/event-log-plugin/server';
import { formatGapAutoFillSchedulerLogEntry } from './utils';

const createEventLogEntry = (
  overrides: Partial<IValidatedEventInternalDocInfo> = {}
): IValidatedEventInternalDocInfo =>
  ({
    _id: 'event-1',
    '@timestamp': '2023-01-01T00:00:00.000Z',
    message: 'Gap auto fill execution',
    kibana: {
      gap_auto_fill: {
        execution: {
          status: 'success',
          results: [],
        },
      },
    },
    ...overrides,
  } as unknown as IValidatedEventInternalDocInfo);

describe('formatGapAutoFillSchedulerLogEntry', () => {
  test('formats full log entry', () => {
    const entry = createEventLogEntry({
      _id: 'log-1',
      '@timestamp': '2023-02-01T00:00:00.000Z',
      message: 'Execution finished',
      kibana: {
        gap_auto_fill: {
          execution: {
            status: 'success',
            results: [
              {
                rule_id: 'rule-1',
                processed_gaps: 10,
                status: 'success',
                error: 'none',
              },
            ],
          },
        },
      },
    });

    const result = formatGapAutoFillSchedulerLogEntry(entry);

    expect(result).toEqual({
      id: 'log-1',
      timestamp: '2023-02-01T00:00:00.000Z',
      status: 'success',
      message: 'Execution finished',
      results: [
        {
          ruleId: 'rule-1',
          processedGaps: 10,
          status: 'success',
          error: 'none',
        },
      ],
    });
  });

  test('handles missing execution or results gracefully', () => {
    const entryWithoutExecution = createEventLogEntry({
      kibana: {} as unknown as IValidatedEventInternalDocInfo['kibana'],
    });

    const result = formatGapAutoFillSchedulerLogEntry(entryWithoutExecution);

    expect(result).toEqual({
      id: 'event-1',
      timestamp: '2023-01-01T00:00:00.000Z',
      status: undefined,
      message: 'Gap auto fill execution',
      results: [],
    });
  });
});
