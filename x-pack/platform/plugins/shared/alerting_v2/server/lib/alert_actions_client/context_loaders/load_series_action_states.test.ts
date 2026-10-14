/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createQueryService } from '../../services/query_service/query_service.mock';
import {
  getEmptyESQLResponse,
  getSeriesActionStateESQLResponse,
} from '../fixtures/query_responses';
import { loadSeriesActionStatesByGroupHash } from './load_series_action_states';

describe('loadSeriesActionStatesByGroupHash', () => {
  const SPACE_ID = 'default';

  const setup = () => createQueryService();

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('short-circuits on an empty input without issuing any ES|QL query', async () => {
    const { queryService, mockEsClient } = setup();

    const states = await loadSeriesActionStatesByGroupHash({
      queryService,
      spaceId: SPACE_ID,
      groupHashes: [],
    });

    expect(states.size).toBe(0);
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('issues a single query over the series snooze actions keyed by a deduplicated group_hash IN clause', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(getSeriesActionStateESQLResponse());

    await loadSeriesActionStatesByGroupHash({
      queryService,
      spaceId: SPACE_ID,
      groupHashes: ['gh-1', 'gh-2', 'gh-1'],
    });

    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
    const { query } = mockEsClient.esql.query.mock.calls[0][0];
    expect(query).toContain('FROM ".alert-actions"');
    expect(query).toContain(`space_id == "${SPACE_ID}"`);
    expect(query).toMatch(/group_hash IN \("gh-1",\s*"gh-2"\)/);
    expect(query).toContain('alert_id IS NULL');
    expect(query).toContain('action_type IN ("snooze", "unsnooze")');
    expect(query).toContain('BY group_hash');
  });

  it('reads a series as snoozed only while its latest snooze/unsnooze is an unexpired snooze', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getSeriesActionStateESQLResponse([
        { group_hash: 'indefinite', last_snooze_action: 'snooze', snoozed_until: null },
        {
          group_hash: 'until-later',
          last_snooze_action: 'snooze',
          snoozed_until: '2026-01-02T00:00:00.000Z',
        },
        {
          group_hash: 'expired',
          last_snooze_action: 'snooze',
          snoozed_until: '2026-01-01T00:00:00.000Z',
        },
        {
          group_hash: 'unsnoozed',
          last_snooze_action: 'unsnooze',
          snoozed_until: '2026-01-02T00:00:00.000Z',
        },
      ])
    );

    const states = await loadSeriesActionStatesByGroupHash({
      queryService,
      spaceId: SPACE_ID,
      groupHashes: ['indefinite', 'until-later', 'expired', 'unsnoozed'],
    });

    expect(Object.fromEntries(states)).toEqual({
      indefinite: { snoozed: true, snoozed_until: null },
      'until-later': { snoozed: true, snoozed_until: '2026-01-02T00:00:00.000Z' },
      expired: { snoozed: false, snoozed_until: null },
      unsnoozed: { snoozed: false, snoozed_until: null },
    });
  });

  it('returns an empty map when the series have no recorded snooze actions', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

    const states = await loadSeriesActionStatesByGroupHash({
      queryService,
      spaceId: SPACE_ID,
      groupHashes: ['gh-1'],
    });

    expect(states.size).toBe(0);
  });
});
