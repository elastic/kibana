/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCaseConflictRebaseDecision,
  isRetryableCaseConflictError,
  rebaseCaseMutationOnConflict,
} from './conflict_rebase';
import { basicCaseFixture } from './test_fixtures';

describe('conflict_rebase', () => {
  const conflictError = Object.assign(new Error('Conflict'), {
    body: { statusCode: 409 },
  });

  it('treats incremental id drift as rebasable system drift', () => {
    const latestCase = {
      ...basicCaseFixture,
      incrementalId: 42,
      updatedAt: '2024-01-01T00:00:00.000Z',
      version: 'WzQ4LDFd',
    };

    expect(
      getCaseConflictRebaseDecision({
        staleCases: [basicCaseFixture],
        latestCases: [latestCase],
      })
    ).toBe('only_system_drift');
  });

  it('treats user-visible case changes as conflicting drift', () => {
    expect(
      getCaseConflictRebaseDecision({
        staleCases: [basicCaseFixture],
        latestCases: [{ ...basicCaseFixture, title: 'A different title', version: 'WzQ4LDFd' }],
      })
    ).toBe('conflicting_case_change');
  });

  it('retries once with rebuilt request after a retryable conflict', async () => {
    const latestCase = {
      ...basicCaseFixture,
      incrementalId: 42,
      updatedAt: '2024-01-01T00:00:00.000Z',
      version: 'WzQ4LDFd',
    };
    const executeRequest = jest
      .fn()
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce('ok');
    const fetchLatestCase = jest.fn().mockResolvedValue(latestCase);

    const response = await rebaseCaseMutationOnConflict({
      request: { caseId: basicCaseFixture.id, version: basicCaseFixture.version },
      preRequestServerState: [basicCaseFixture],
      executeRequest,
      fetchLatestCase,
      buildRetryRequest: ({ request, latestCases }) => ({
        ...request,
        version: latestCases.get(basicCaseFixture.id)?.version ?? request.version,
      }),
    });

    expect(response).toBe('ok');
    expect(fetchLatestCase).toHaveBeenCalledWith(basicCaseFixture.id);
    expect(executeRequest).toHaveBeenNthCalledWith(2, {
      caseId: basicCaseFixture.id,
      version: latestCase.version,
    });
  });

  it('re-throws the original error when user-visible fields changed on the latest case', async () => {
    const executeRequest = jest
      .fn()
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce('ok');
    const fetchLatestCase = jest.fn().mockResolvedValue({
      ...basicCaseFixture,
      title: 'A different title',
      version: 'WzQ4LDFd',
    });

    await expect(
      rebaseCaseMutationOnConflict({
        request: { caseId: basicCaseFixture.id, version: basicCaseFixture.version },
        preRequestServerState: [basicCaseFixture],
        executeRequest,
        fetchLatestCase,
        buildRetryRequest: ({ request }) => request,
      })
    ).rejects.toThrow('Conflict');

    expect(fetchLatestCase).toHaveBeenCalledWith(basicCaseFixture.id);
    expect(executeRequest).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a rebase for non-conflict errors', async () => {
    const executeRequest = jest.fn().mockRejectedValue(new Error('boom'));
    const fetchLatestCase = jest.fn();

    await expect(
      rebaseCaseMutationOnConflict({
        request: { caseId: basicCaseFixture.id, version: basicCaseFixture.version },
        preRequestServerState: [basicCaseFixture],
        executeRequest,
        fetchLatestCase,
        buildRetryRequest: ({ request }) => request,
      })
    ).rejects.toThrow('boom');

    expect(fetchLatestCase).not.toHaveBeenCalled();
    expect(isRetryableCaseConflictError(new Error('boom'))).toBe(false);
  });
});
