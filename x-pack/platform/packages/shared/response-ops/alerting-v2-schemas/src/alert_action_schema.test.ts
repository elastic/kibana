/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  bulkActivateEpisodeActionBodySchema,
  bulkAssignEpisodeActionBodySchema,
  bulkSnoozeSeriesActionBodySchema,
  bulkTagEpisodeActionBodySchema,
  createAckEpisodeActionBodySchema,
  createEpisodeAlertActionBodySchema,
  createSeriesAlertActionBodySchema,
  episodeAlertActionParamsSchema,
  seriesAlertActionParamsSchema,
} from './alert_action_schema';
import { ID_MAX_LENGTH, SERIES_ID_MAX_LENGTH } from './constants';

const GROUP_HASH = 'a'.repeat(64);
const SERIES_ID =
  'MTo6cnVsZTo6ZGVmYXVsdDo6Y3B1LWhpZ2g6Ojk4MDU4Y2I1NjkwMTdlY2I2YjA4YjU1NGVjYmNiMjUyNGZmN2RkODk3MTgyOGY0ZjJlNTkzOWMxZTY2NjdlNTY';
const OTHER_SERIES_ID =
  'MTo6cnVsZTo6ZGVmYXVsdDo6bWVtLWhpZ2g6OjYyYjg2ZWNhNGIxZDFlNmUxZjljMGIwYTJmMmQ0YjdjMWEzZTVmNzA4MTkyODM3NDY1NTY0NzM4MjkxMDMwN2E';

describe('createSeriesAlertActionBodySchema', () => {
  it('accepts every series-level action variant', () => {
    const variants = [
      { action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE, snoozed_until: '2026-08-12T00:00:00.000Z' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE },
      { action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
    ];

    for (const variant of variants) {
      expect(() => createSeriesAlertActionBodySchema.parse(variant)).not.toThrow();
    }
  });

  it('rejects episode-level action types', () => {
    expect(() =>
      createSeriesAlertActionBodySchema.parse({
        action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
      })
    ).toThrow();
    expect(() =>
      createSeriesAlertActionBodySchema.parse({
        action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
        tags: ['p1'],
      })
    ).toThrow();
    expect(() =>
      createSeriesAlertActionBodySchema.parse({
        action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
        reason: 'reason',
      })
    ).toThrow();
  });
});

describe('createEpisodeAlertActionBodySchema', () => {
  it('accepts every episode-level action variant', () => {
    const variants = [
      { action_type: ALERT_EPISODE_ACTION_TYPE.TAG, tags: ['p1'] },
      { action_type: ALERT_EPISODE_ACTION_TYPE.ACK },
      { action_type: ALERT_EPISODE_ACTION_TYPE.UNACK },
      { action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN, assignee_uid: 'u1' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN, assignee_uid: null },
      { action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE, reason: 'reason' },
      { action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE, reason: 'reason' },
    ];

    for (const variant of variants) {
      expect(() => createEpisodeAlertActionBodySchema.parse(variant)).not.toThrow();
    }
  });

  it('rejects series-level action types', () => {
    expect(() =>
      createEpisodeAlertActionBodySchema.parse({
        action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
      })
    ).toThrow();
  });

  it('bounds assignee_uid like the read model (1 to ID_MAX_LENGTH chars)', () => {
    const assign = (assigneeUid: string) =>
      createEpisodeAlertActionBodySchema.safeParse({
        action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
        assignee_uid: assigneeUid,
      }).success;

    expect(assign('a'.repeat(ID_MAX_LENGTH))).toBe(true);
    expect(assign('a'.repeat(ID_MAX_LENGTH + 1))).toBe(false);
    expect(assign('')).toBe(false);
  });

  it('rejects alert_id in the body (strict, the alert is addressed by the path)', () => {
    expect(() =>
      createEpisodeAlertActionBodySchema.parse({
        action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
        alert_id: 'episode-1',
      })
    ).toThrow();
  });
});

describe('createAckEpisodeActionBodySchema', () => {
  it('accepts an empty body', () => {
    expect(() => createAckEpisodeActionBodySchema.parse({})).not.toThrow();
  });

  it('rejects alert_id in the body (strict)', () => {
    expect(() => createAckEpisodeActionBodySchema.parse({ alert_id: 'episode-1' })).toThrow();
  });
});

describe('seriesAlertActionParamsSchema', () => {
  it('accepts a series_id and rejects an empty one', () => {
    expect(() => seriesAlertActionParamsSchema.parse({ series_id: SERIES_ID })).not.toThrow();
    expect(() => seriesAlertActionParamsSchema.parse({ series_id: '' })).toThrow();
  });

  it('rejects anything outside the base64url alphabet', () => {
    expect(() => seriesAlertActionParamsSchema.parse({ series_id: 'series 1' })).toThrow();
    expect(() => seriesAlertActionParamsSchema.parse({ series_id: 'series/1' })).toThrow();
    expect(() => seriesAlertActionParamsSchema.parse({ series_id: `${SERIES_ID}==` })).toThrow();
  });

  it('bounds the length', () => {
    expect(() =>
      seriesAlertActionParamsSchema.parse({ series_id: 'a'.repeat(SERIES_ID_MAX_LENGTH) })
    ).not.toThrow();
    expect(() =>
      seriesAlertActionParamsSchema.parse({ series_id: 'a'.repeat(SERIES_ID_MAX_LENGTH + 1) })
    ).toThrow();
  });

  it('rejects unknown keys (strict mode)', () => {
    expect(() =>
      seriesAlertActionParamsSchema.parse({ series_id: SERIES_ID, foo: 'bar' })
    ).toThrow();
  });
});

describe('episodeAlertActionParamsSchema', () => {
  it('accepts an id and rejects an empty one', () => {
    expect(() => episodeAlertActionParamsSchema.parse({ id: 'episode-1' })).not.toThrow();
    expect(() => episodeAlertActionParamsSchema.parse({ id: '' })).toThrow();
  });

  it('rejects unknown keys (strict mode)', () => {
    expect(() => episodeAlertActionParamsSchema.parse({ id: 'episode-1', foo: 'bar' })).toThrow();
  });
});

describe('verb-specific bulk action body schemas', () => {
  it('accepts a valid bulk tag episode envelope', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse({ items: [{ alert_id: 'e1', tags: ['p1'] }] })
    ).not.toThrow();
  });

  it('accepts a valid bulk snooze series envelope', () => {
    expect(() =>
      bulkSnoozeSeriesActionBodySchema.parse({
        items: [
          { series_id: SERIES_ID, snoozed_until: '2026-08-12T00:00:00.000Z' },
          { series_id: OTHER_SERIES_ID },
        ],
      })
    ).not.toThrow();
  });

  it('accepts a valid bulk assign episode envelope', () => {
    expect(() =>
      bulkAssignEpisodeActionBodySchema.parse({
        items: [{ alert_id: 'e1', assignee_uid: null }],
      })
    ).not.toThrow();
  });

  it('accepts a valid bulk activate episode envelope', () => {
    expect(() =>
      bulkActivateEpisodeActionBodySchema.parse({
        items: [{ alert_id: 'e1', reason: 'reopen' }],
      })
    ).not.toThrow();
  });

  it('rejects a bare array body (items envelope is required)', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse([{ alert_id: 'e1', tags: ['p1'] }])
    ).toThrow();
  });

  it('rejects an empty items list', () => {
    expect(() => bulkTagEpisodeActionBodySchema.parse({ items: [] })).toThrow();
  });

  it('rejects an unknown envelope field (strict mode)', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse({
        items: [{ alert_id: 'e1', tags: ['p1'] }],
        force: true,
      })
    ).toThrow();
  });

  it('rejects an item carrying action_type (strict mode, the verb is in the path)', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse({
        items: [{ alert_id: 'e1', tags: ['p1'], action_type: ALERT_EPISODE_ACTION_TYPE.TAG }],
      })
    ).toThrow();
  });

  it('rejects an episode item keyed by group_hash', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse({ items: [{ group_hash: GROUP_HASH, tags: ['p1'] }] })
    ).toThrow();
    expect(() =>
      bulkAssignEpisodeActionBodySchema.parse({
        items: [{ group_hash: GROUP_HASH, assignee_uid: null }],
      })
    ).toThrow();
  });

  it('rejects an episode envelope that repeats an alert_id', () => {
    expect(() =>
      bulkTagEpisodeActionBodySchema.parse({
        items: [
          { alert_id: 'e1', tags: ['p1'] },
          { alert_id: 'e2', tags: ['p1'] },
          { alert_id: 'e1', tags: ['p2'] },
        ],
      })
    ).toThrow('Each alert_id can appear at most once per request; [e1] is repeated');
  });

  it('rejects a series envelope that repeats a series_id', () => {
    expect(() =>
      bulkSnoozeSeriesActionBodySchema.parse({
        items: [{ series_id: SERIES_ID }, { series_id: SERIES_ID }],
      })
    ).toThrow(`Each series_id can appear at most once per request; [${SERIES_ID}] is repeated`);
  });
});
