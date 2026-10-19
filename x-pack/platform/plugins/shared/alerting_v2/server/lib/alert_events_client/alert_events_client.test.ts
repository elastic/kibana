/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { AlertEventsClient, getGroupHash, getValueByDottedPath } from './alert_events_client';
import { createMockStorageServiceContract } from '../services/storage_service/storage_service.mock';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { createMockResourceManager } from '../services/resource_service/resource_manager.mock';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createMockAlertStatusChangedEventPublisher } from '../events/alert_status_changed_event_publisher/alert_status_changed_event_publisher.mock';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import {
  ALERT_EVENTS_RESOURCE_KEY,
  alertEpisodeStatus,
} from '../../resources/datastreams/alert_events';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('getValueByDottedPath', () => {
  const data = {
    monitor_id: '55501',
    scope: 'host:web-01',
    labels: { env: 'prod' },
  };

  it('reads bare keys under data', () => {
    expect(getValueByDottedPath(data, 'monitor_id')).toBe('55501');
    expect(getValueByDottedPath(data, 'scope')).toBe('host:web-01');
  });

  it('reads nested dotted paths under data', () => {
    expect(getValueByDottedPath(data, 'labels.env')).toBe('prod');
  });

  it('returns undefined for missing paths', () => {
    expect(getValueByDottedPath(data, 'missing')).toBeUndefined();
    expect(getValueByDottedPath(data, 'labels.missing')).toBeUndefined();
    expect(getValueByDottedPath(data, '')).toBeUndefined();
  });

  it('does not treat a data. prefix as special — that walks nested data.data', () => {
    expect(getValueByDottedPath(data, 'data.monitor_id')).toBeUndefined();
  });
});

describe('getGroupHash', () => {
  const spaceId = 'default';

  it('hashes explicit fingerprint with space and source once', () => {
    expect(getGroupHash({ source: 'datadog', fingerprint: 'fp-1' }, spaceId)).toBe(
      sha256('default:datadog:fp-1')
    );
  });

  it('resolves fingerprint_fields only under data (bare + nested)', () => {
    const hash = getGroupHash(
      {
        source: 'datadog',
        fingerprint_fields: ['monitor_id', 'scope', 'labels.env'],
        data: { monitor_id: '55501', scope: 'host:web-01', labels: { env: 'prod' } },
      },
      spaceId
    );
    expect(hash).toBe(
      sha256(
        'default:datadog:' +
          JSON.stringify([
            ['monitor_id', '55501'],
            ['scope', 'host:web-01'],
            ['labels.env', 'prod'],
          ])
      )
    );
  });

  it('ignores root fields named in fingerprint_fields', () => {
    const withRoot = getGroupHash(
      {
        source: 'datadog',
        fingerprint_fields: ['rule_id'],
        rule_id: 'should-not-be-used',
        data: {},
      },
      spaceId
    );
    const missing = getGroupHash(
      {
        source: 'datadog',
        fingerprint_fields: ['rule_id'],
        data: {},
      },
      spaceId
    );
    expect(withRoot).toBe(missing);
    expect(withRoot).toBe(sha256('default:datadog:' + JSON.stringify([['rule_id', '']])));
  });

  it('is deterministic for the same fingerprint_fields inputs', () => {
    const event = {
      source: 'datadog' as const,
      fingerprint_fields: ['monitor_id', 'scope'],
      data: { monitor_id: '55501', scope: 'host:web-01' },
    };
    expect(getGroupHash(event, spaceId)).toBe(getGroupHash(event, spaceId));
  });

  it('falls back to rule_id when fingerprint_fields are absent', () => {
    expect(getGroupHash({ source: 'pagerduty', rule_id: 'mon-1' }, spaceId)).toBe(
      sha256('default:pagerduty:mon-1')
    );
  });
});

const createClient = (
  queryRows: Array<{ last_episode_id: string; last_episode_status: string }>,
  spaceId = 'default'
) => {
  const storageService = createMockStorageServiceContract();
  storageService.bulkIndexDocs.mockImplementation(async ({ docs }) => ({
    attempted: docs.length,
    docs: [...docs],
    errors: [],
  }));

  const queryService: jest.Mocked<Pick<QueryServiceContract, 'executeQueryRows'>> = {
    executeQueryRows: jest.fn().mockResolvedValue(queryRows),
  };

  const resourceManager = createMockResourceManager();
  const publisher = createMockAlertStatusChangedEventPublisher();
  const { loggerService, mockLogger } = createLoggerService();

  const client = new AlertEventsClient(
    storageService,
    queryService as unknown as QueryServiceContract,
    spaceId,
    resourceManager,
    publisher,
    loggerService
  );

  return { client, storageService, queryService, resourceManager, publisher, mockLogger };
};

describe('AlertEventsClient.createAlertEvent episode lifecycle', () => {
  it('waits for the rule events data stream to be ready before writing', async () => {
    const { client, storageService, resourceManager } = createClient([]);

    await client.createAlertEvent({ source: 'datadog', fingerprint: 'ready-fp' });

    expect(resourceManager.ensureResourceReady).toHaveBeenCalledWith(ALERT_EVENTS_RESOURCE_KEY);
    expect(resourceManager.ensureResourceReady.mock.invocationCallOrder[0]).toBeLessThan(
      storageService.bulkIndexDocs.mock.invocationCallOrder[0]
    );
  });

  it('does not write when the data stream fails to initialize', async () => {
    const { client, storageService, resourceManager } = createClient([]);
    resourceManager.ensureResourceReady.mockRejectedValue(new Error('init failed'));

    await expect(
      client.createAlertEvent({ source: 'datadog', fingerprint: 'ready-fp' })
    ).rejects.toThrow('init failed');
    expect(storageService.bulkIndexDocs).not.toHaveBeenCalled();
  });

  it('mints a new episode id when no prior episode exists', async () => {
    const { client, storageService } = createClient([]);
    const result = await client.createAlertEvent({
      source: 'datadog',
      fingerprint: 'lifecycle-fp',
      alert_status: ALERT_EPISODE_STATUS.ACTIVE,
    });

    expect(result.alert_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
  });

  it('returns the group hash and the alert id written on the rule event', async () => {
    const { client, storageService } = createClient([]);
    const result = await client.createAlertEvent({
      source: 'datadog',
      fingerprint: 'lifecycle-fp',
      alert_status: ALERT_EPISODE_STATUS.ACTIVE,
    });

    const [{ docs }] = storageService.bulkIndexDocs.mock.calls[0];
    expect(docs[0]).toMatchObject({
      group_hash: result.group_hash,
      alert: { id: result.alert_id },
    });
    expect(result).not.toHaveProperty('episode_id');
  });

  it('resolves the prior episode from the alert.id and alert.status of the series', async () => {
    const { client, queryService } = createClient([]);

    await client.createAlertEvent({ source: 'datadog', fingerprint: 'lifecycle-fp' });

    const [{ query }] = queryService.executeQueryRows.mock.calls[0];
    expect(query).toContain('alert.status IS NOT NULL');
    expect(query).toContain('last_episode_id = LAST(alert.id, @timestamp)');
    expect(query).toContain('last_episode_status = LAST(alert.status, @timestamp)');
    expect(query).not.toContain('episode.');
  });

  it('reuses the prior episode id while the series is still active', async () => {
    const priorEpisodeId = '11111111-1111-1111-1111-111111111111';
    const { client } = createClient([
      { last_episode_id: priorEpisodeId, last_episode_status: alertEpisodeStatus.active },
    ]);

    const result = await client.createAlertEvent({
      source: 'datadog',
      fingerprint: 'lifecycle-fp',
      alert_status: ALERT_EPISODE_STATUS.ACTIVE,
    });

    expect(result.alert_id).toBe(priorEpisodeId);
  });

  it('mints a new episode id after an inactive episode when re-firing', async () => {
    const priorEpisodeId = '22222222-2222-2222-2222-222222222222';
    const { client } = createClient([
      { last_episode_id: priorEpisodeId, last_episode_status: alertEpisodeStatus.inactive },
    ]);

    const result = await client.createAlertEvent({
      source: 'datadog',
      fingerprint: 'lifecycle-fp',
      alert_status: ALERT_EPISODE_STATUS.ACTIVE,
    });

    expect(result.alert_id).not.toBe(priorEpisodeId);
    expect(result.alert_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('leaves @timestamp unset when the caller does not supply one', async () => {
    const { client, storageService } = createClient([]);

    await client.createAlertEvent({ source: 'datadog', fingerprint: 'ts-fp' });

    const [{ docs }] = storageService.bulkIndexDocs.mock.calls[0];
    expect(docs[0]).not.toHaveProperty('@timestamp');
    expect(docs[0]).toHaveProperty('scheduled_timestamp', expect.any(String));
  });

  it('passes a caller-supplied timestamp through as @timestamp and scheduled_timestamp', async () => {
    const { client, storageService } = createClient([]);
    const timestamp = '2026-07-29T12:00:00.000Z';

    await client.createAlertEvent({ source: 'datadog', fingerprint: 'ts-fp', timestamp });

    const [{ docs }] = storageService.bulkIndexDocs.mock.calls[0];
    expect(docs[0]).toMatchObject({ '@timestamp': timestamp, scheduled_timestamp: timestamp });
  });
});

describe('AlertEventsClient.createAlertEvent status changes', () => {
  const priorEpisodeId = '33333333-3333-3333-3333-333333333333';

  it('publishes the first event of a series with a null previous status and no rule', async () => {
    const { client, publisher } = createClient([], 'my-space');

    const result = await client.createAlertEvent({
      source: 'datadog',
      fingerprint: 'status-fp',
      alert_status: ALERT_EPISODE_STATUS.ACTIVE,
    });

    expect(publisher.publishAlertStatusChanges).toHaveBeenCalledTimes(1);
    expect(publisher.publishAlertStatusChanges).toHaveBeenCalledWith([
      {
        spaceId: 'my-space',
        source: 'datadog',
        alert: {
          id: result.alert_id,
          groupHash: result.group_hash,
          status: ALERT_EPISODE_STATUS.ACTIVE,
          previousStatus: null,
        },
        rule: null,
        execution: null,
      },
    ]);
  });

  it('publishes a status change with the previous status of the series', async () => {
    const { client, publisher } = createClient([
      { last_episode_id: priorEpisodeId, last_episode_status: alertEpisodeStatus.active },
    ]);

    await client.createAlertEvent({
      source: 'datadog',
      fingerprint: 'status-fp',
      alert_status: ALERT_EPISODE_STATUS.RECOVERING,
    });

    expect(publisher.publishAlertStatusChanges).toHaveBeenCalledWith([
      expect.objectContaining({
        alert: expect.objectContaining({
          id: priorEpisodeId,
          status: ALERT_EPISODE_STATUS.RECOVERING,
          previousStatus: ALERT_EPISODE_STATUS.ACTIVE,
        }),
      }),
    ]);
  });

  it('publishes a new episode after an inactive one with the inactive previous status', async () => {
    const { client, publisher } = createClient([
      { last_episode_id: priorEpisodeId, last_episode_status: alertEpisodeStatus.inactive },
    ]);

    const result = await client.createAlertEvent({
      source: 'datadog',
      fingerprint: 'status-fp',
      alert_status: ALERT_EPISODE_STATUS.ACTIVE,
    });

    expect(result.alert_id).not.toBe(priorEpisodeId);
    expect(publisher.publishAlertStatusChanges).toHaveBeenCalledWith([
      expect.objectContaining({
        alert: expect.objectContaining({
          id: result.alert_id,
          status: ALERT_EPISODE_STATUS.ACTIVE,
          previousStatus: ALERT_EPISODE_STATUS.INACTIVE,
        }),
      }),
    ]);
  });

  it('does not publish when the write leaves the status unchanged', async () => {
    const { client, storageService, publisher } = createClient([
      { last_episode_id: priorEpisodeId, last_episode_status: alertEpisodeStatus.active },
    ]);

    await client.createAlertEvent({
      source: 'datadog',
      fingerprint: 'status-fp',
      alert_status: ALERT_EPISODE_STATUS.ACTIVE,
    });

    expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
    expect(publisher.publishAlertStatusChanges).not.toHaveBeenCalled();
  });

  it('does not publish when the write is rejected', async () => {
    const { client, storageService, publisher } = createClient([]);
    storageService.bulkIndexDocs.mockImplementation(async ({ docs }) => ({
      attempted: docs.length,
      docs: [],
      errors: docs.map((document) => ({
        code: 'mapper_parsing_exception',
        message: 'boom',
        index: 'rule-events',
        document,
      })),
    }));

    await expect(
      client.createAlertEvent({ source: 'datadog', fingerprint: 'status-fp' })
    ).rejects.toThrow('Failed to persist alert event: boom');
    expect(publisher.publishAlertStatusChanges).not.toHaveBeenCalled();
  });

  it('logs a publish failure and still returns the stored alert', async () => {
    const { client, publisher, mockLogger } = createClient([]);
    publisher.publishAlertStatusChanges.mockRejectedValueOnce(new Error('bus unavailable'));

    const result = await client.createAlertEvent({ source: 'datadog', fingerprint: 'status-fp' });

    expect(result.alert_id).toEqual(expect.any(String));
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to publish alert status change',
      expect.objectContaining({
        labels: expect.objectContaining({
          code: ALERTING_LOG_CODES.EVENTS_ALERT_STATUS_CHANGED_PUBLISH_FAILED,
        }),
      })
    );
  });
});
