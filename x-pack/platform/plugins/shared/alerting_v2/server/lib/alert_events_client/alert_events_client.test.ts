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
import { alertEpisodeStatus } from '../../resources/datastreams/alert_events';

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
    expect(hash).toBe(sha256('default:datadog:monitor_id|scope|labels.env|55501|host:web-01|prod'));
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
    expect(withRoot).toBe(sha256('default:datadog:rule_id|'));
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

describe('AlertEventsClient.ingestAlertEvent episode lifecycle', () => {
  const spaceId = 'default';

  const createClient = (
    queryRows: Array<{ last_episode_id: string; last_episode_status: string }>
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

    const client = new AlertEventsClient(
      storageService,
      queryService as unknown as QueryServiceContract,
      spaceId
    );

    return { client, storageService, queryService };
  };

  it('mints a new episode id when no prior episode exists', async () => {
    const { client, storageService } = createClient([]);
    const result = await client.ingestAlertEvent({
      source: 'datadog',
      fingerprint: 'lifecycle-fp',
      alert_status: ALERT_EPISODE_STATUS.ACTIVE,
    });

    expect(result.episode_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(storageService.bulkIndexDocs).toHaveBeenCalledTimes(1);
  });

  it('reuses the prior episode id while the series is still active', async () => {
    const priorEpisodeId = '11111111-1111-1111-1111-111111111111';
    const { client } = createClient([
      { last_episode_id: priorEpisodeId, last_episode_status: alertEpisodeStatus.active },
    ]);

    const result = await client.ingestAlertEvent({
      source: 'datadog',
      fingerprint: 'lifecycle-fp',
      alert_status: ALERT_EPISODE_STATUS.ACTIVE,
    });

    expect(result.episode_id).toBe(priorEpisodeId);
  });

  it('mints a new episode id after an inactive episode when re-firing', async () => {
    const priorEpisodeId = '22222222-2222-2222-2222-222222222222';
    const { client } = createClient([
      { last_episode_id: priorEpisodeId, last_episode_status: alertEpisodeStatus.inactive },
    ]);

    const result = await client.ingestAlertEvent({
      source: 'datadog',
      fingerprint: 'lifecycle-fp',
      alert_status: ALERT_EPISODE_STATUS.ACTIVE,
    });

    expect(result.episode_id).not.toBe(priorEpisodeId);
    expect(result.episode_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});
