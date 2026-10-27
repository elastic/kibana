/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { NOTIFICATION_DATA_RETENTION } from '../storage/notification_data_stream';
import { MAX_SEVERITY_TTL_DAYS, SEVERITY_TTL_DAYS } from '../../common/notification_schema';
import { NotificationCleanupService } from './cleanup_expired_notifications';

describe('SEVERITY_TTL_DAYS', () => {
  it('has correct TTLs per severity', () => {
    expect(SEVERITY_TTL_DAYS.info).toBe(30);
    expect(SEVERITY_TTL_DAYS.warning).toBe(60);
    expect(SEVERITY_TTL_DAYS.error).toBe(180);
    expect(SEVERITY_TTL_DAYS.critical).toBe(180);
    expect(MAX_SEVERITY_TTL_DAYS).toBe(180);
  });

  it('all TTLs stay within the data stream ILM ceiling', () => {
    const ceilingDays = Number(NOTIFICATION_DATA_RETENTION.replace('d', ''));

    for (const days of Object.values(SEVERITY_TTL_DAYS)) {
      expect(days).toBeLessThanOrEqual(ceilingDays);
    }
  });
});

describe('NotificationCleanupService.run', () => {
  const setup = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({
      aggregations: { expired_groups: { buckets: [] } },
    } as never);
    esClient.deleteByQuery.mockResolvedValue({} as never);
    const logger = loggingSystemMock.createLogger();

    return { esClient, logger, service: new NotificationCleanupService(esClient, logger) };
  };

  it('searches for expired groups with the abort signal', async () => {
    const { esClient, service } = setup();
    const { signal } = new AbortController();

    await service.run(signal);

    expect(esClient.search).toHaveBeenCalledWith(expect.any(Object), { signal });
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('logs an error and does not throw when cleanup fails', async () => {
    const { esClient, logger, service } = setup();
    esClient.search.mockRejectedValueOnce(new Error('ES unavailable'));

    await expect(service.run(new AbortController().signal)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES unavailable'));
  });

  it('does not start cleanup after the task is aborted', async () => {
    const { esClient, service } = setup();
    const aborted = new AbortController();
    aborted.abort();

    await service.run(aborted.signal);

    expect(esClient.search).not.toHaveBeenCalled();
  });
});
