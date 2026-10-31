/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getObservableSource, mirrorToObservablesIndex } from './observables_index_sync';

describe('mirrorToObservablesIndex', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns no attributes when the write succeeds', async () => {
    const write = jest.fn().mockResolvedValue(undefined);

    await expect(mirrorToObservablesIndex({ caseId: 'case-1', logger, write })).resolves.toEqual(
      {}
    );
    expect(write).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  // Failure scenario: the observables index rejects the write; the caller still has to save the case.
  it('flags the case as pending sync and logs the error when the write fails', async () => {
    const error = new Error('index down');

    await expect(
      mirrorToObservablesIndex({
        caseId: 'case-1',
        logger,
        write: () => Promise.reject(error),
      })
    ).resolves.toEqual({ observables_sync_pending: true });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('case case-1'), {
      error: { stack_trace: error.stack },
    });
  });

  it('still flags the case when something other than an Error is thrown', async () => {
    await expect(
      mirrorToObservablesIndex({
        caseId: 'case-1',
        logger,
        write: jest.fn().mockRejectedValue('plain string'),
      })
    ).resolves.toEqual({ observables_sync_pending: true });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('plain string'), {
      error: { stack_trace: undefined },
    });
  });
});

describe('getObservableSource', () => {
  it.each([
    ['workflow', 'workflow'],
    ['agent_builder', 'agent'],
    ['rest_api', 'api'],
    ['plugin_contract', 'api'],
    ['connector', 'api'],
  ] as const)('maps %s to %s', (clientSource, source) => {
    expect(getObservableSource(clientSource)).toBe(source);
  });
});
