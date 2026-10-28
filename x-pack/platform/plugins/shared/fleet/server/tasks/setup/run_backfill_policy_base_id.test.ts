/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { appContextService } from '../../services';
import { backfillPolicyBaseId } from '../../services/backfill_policy_base_id';

import { BACKFILL_CONTINUE_DELAY_MS, runBackfillPolicyBaseId } from './run_backfill_policy_base_id';

jest.mock('../../services/backfill_policy_base_id');

describe('runBackfillPolicyBaseId', () => {
  const logger = loggingSystemMock.createLogger();
  const backfill = jest.mocked(backfillPolicyBaseId);

  beforeEach(() => {
    backfill.mockReset();
    jest
      .spyOn(appContextService, 'getInternalUserESClient')
      .mockReturnValue(elasticsearchServiceMock.createElasticsearchClient());
  });

  it('backfills with the internal user client, the task signal and logger', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    jest.spyOn(appContextService, 'getInternalUserESClient').mockReturnValue(esClient);
    backfill.mockResolvedValue([]);
    const { signal } = new AbortController();

    await runBackfillPolicyBaseId({ signal, logger });

    expect(backfillPolicyBaseId).toHaveBeenCalledWith(esClient, { signal, logger });
  });

  it('does not reschedule the task when the backfill completed', async () => {
    backfill.mockResolvedValue([
      { label: 'fleet-agents', status: 'completed', updated: 5 },
      { label: 'fleet-policies', status: 'completed', updated: 0 },
    ]);

    expect(
      await runBackfillPolicyBaseId({ signal: new AbortController().signal, logger })
    ).toBeUndefined();
  });

  it('schedules the next run when an index is partial after updating documents', async () => {
    backfill.mockResolvedValue([
      { label: 'fleet-agents', status: 'completed', updated: 5 },
      { label: 'fleet-policies', status: 'partial', updated: 7950 },
    ]);
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

    const result = await runBackfillPolicyBaseId({ signal: new AbortController().signal, logger });
    now.mockRestore();

    expect(result).toEqual({ state: {}, runAt: new Date(1_000_000 + BACKFILL_CONTINUE_DELAY_MS) });
  });

  it.each([
    ['made no progress', { status: 'partial', updated: 0 }],
    ['failed', { status: 'failed', updated: 50 }],
  ] as const)('does not reschedule the task when an index %s', async (_, result) => {
    backfill.mockResolvedValue([{ label: 'fleet-policies', ...result }]);

    expect(
      await runBackfillPolicyBaseId({ signal: new AbortController().signal, logger })
    ).toBeUndefined();
  });

  it('does not reschedule the task when it was cancelled', async () => {
    backfill.mockResolvedValue([{ label: 'fleet-policies', status: 'partial', updated: 50 }]);
    const controller = new AbortController();
    controller.abort();

    expect(await runBackfillPolicyBaseId({ signal: controller.signal, logger })).toBeUndefined();
  });
});
