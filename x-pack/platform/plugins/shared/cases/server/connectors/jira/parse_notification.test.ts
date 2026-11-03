/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_NOTIFICATION_EXTERNAL_ID_LENGTH } from '../utils';
import { parseNotification } from './parse_notification';

describe('jira parseNotification', () => {
  it('reads the issue id and its update time from a webhook body', () => {
    expect(
      parseNotification({
        webhookEvent: 'jira:issue_updated',
        timestamp: 1790000000000,
        issue: {
          id: '10001',
          key: 'RJ-1',
          fields: { summary: 'A title', updated: '2026-09-30T10:00:00.000+0000' },
        },
      })
    ).toEqual({ externalId: '10001', updatedAt: '2026-09-30T10:00:00.000+0000' });
  });

  it('accepts a numeric issue id', () => {
    expect(parseNotification({ issue: { id: 10001 } })).toEqual({ externalId: '10001' });
  });

  it('falls back to the webhook timestamp when the issue has no update time', () => {
    expect(parseNotification({ timestamp: 0, issue: { id: '10001' } })).toEqual({
      externalId: '10001',
      updatedAt: '1970-01-01T00:00:00.000Z',
    });
  });

  it.each([
    ['a non-object body', 'issue'],
    ['a body without an issue', { webhookEvent: 'jira:issue_updated' }],
    ['an issue without an id', { issue: { key: 'RJ-1' } }],
    ['a blank issue id', { issue: { id: '  ' } }],
    [
      'an issue id that is too long',
      { issue: { id: 'a'.repeat(MAX_NOTIFICATION_EXTERNAL_ID_LENGTH + 1) } },
    ],
    ['a ServiceNow body', { sys_id: 'abc' }],
  ])('returns null for %s', (_, body) => {
    expect(parseNotification(body)).toBeNull();
  });
});
