/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { executeEsqlRequest } from './lib/execute_esql_request';
import { getRuleExecutor } from './executor';
import { MAX_ALERTS_PER_EXECUTION } from './common';

jest.mock('./lib/execute_esql_request', () => ({
  executeEsqlRequest: jest.fn(),
}));

const executeEsqlRequestMock = executeEsqlRequest as jest.MockedFunction<typeof executeEsqlRequest>;

const makeResult = (id: string) => ({ _id: id, _source: { message: id } });

const createOptions = (interval: string, overrides: Record<string, unknown> = {}) => {
  const logger = loggerMock.create();
  const alertWithPersistence = jest.fn().mockImplementation((alerts: Array<{ _id: string }>) =>
    Promise.resolve({
      createdAlerts: alerts.map((alert) => ({ _id: alert._id })),
      errors: [],
    })
  );

  return {
    logger,
    services: {
      scopedClusterClient: { asCurrentUser: {} },
      alertWithPersistence,
    },
    params: {
      timestampField: '@timestamp',
      query: 'FROM logs-* METADATA _id, _source | WHERE level == "error"',
    },
    state: {},
    startedAt: new Date('2026-07-09T12:00:00.000Z'),
    spaceId: 'default',
    rule: {
      id: 'rule-1',
      schedule: { interval },
    },
    ...overrides,
  } as never;
};

describe('getRuleExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    executeEsqlRequestMock.mockResolvedValue([makeResult('doc-1')]);
  });

  it('keeps a 2m scan window for 1m rules', async () => {
    await getRuleExecutor(createOptions('1m'));

    expect(executeEsqlRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlRequest: expect.objectContaining({
          filter: expect.objectContaining({
            bool: expect.objectContaining({
              filter: [
                {
                  range: {
                    '@timestamp': {
                      lte: '2026-07-09T12:00:00.000Z',
                      gte: '2026-07-09T11:58:00.000Z',
                      format: 'strict_date_optional_time',
                    },
                  },
                },
              ],
            }),
          }),
        }),
      })
    );
  });

  it('uses a 10m scan window for 5m rules', async () => {
    await getRuleExecutor(createOptions('5m'));

    expect(executeEsqlRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlRequest: expect.objectContaining({
          filter: expect.objectContaining({
            bool: expect.objectContaining({
              filter: [
                {
                  range: {
                    '@timestamp': {
                      lte: '2026-07-09T12:00:00.000Z',
                      gte: '2026-07-09T11:50:00.000Z',
                      format: 'strict_date_optional_time',
                    },
                  },
                },
              ],
            }),
          }),
        }),
      })
    );
  });

  it('logs and slices matches that exceed the per-execution cap', async () => {
    const results = Array.from({ length: MAX_ALERTS_PER_EXECUTION + 1 }, (_, index) =>
      makeResult(`doc-${index}`)
    );
    executeEsqlRequestMock.mockResolvedValue(results);
    const options = createOptions('5m') as unknown as {
      logger: ReturnType<typeof loggerMock.create>;
      services: { alertWithPersistence: jest.Mock };
    };

    await getRuleExecutor(options as never);

    expect(options.logger.warn).toHaveBeenCalledWith(expect.stringContaining('truncating results'));
    expect(options.services.alertWithPersistence.mock.calls[0][0]).toHaveLength(
      MAX_ALERTS_PER_EXECUTION
    );
  });
});
