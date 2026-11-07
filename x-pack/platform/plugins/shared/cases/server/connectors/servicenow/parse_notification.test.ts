/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_NOTIFICATION_TIMESTAMP_LENGTH } from '../utils';
import { parseNotification } from './parse_notification';

describe('servicenow parseNotification', () => {
  it('reads the sys_id and the update time of a business rule body', () => {
    expect(
      parseNotification({
        sys_id: '9d385017c611228701d22104cc95c371',
        number: 'INC0010001',
        sys_updated_on: '2026-09-30 10:00:00',
      })
    ).toEqual({
      externalId: '9d385017c611228701d22104cc95c371',
      updatedAt: '2026-09-30 10:00:00',
    });
  });

  it('leaves the update time out when it is missing or too long', () => {
    expect(parseNotification({ sys_id: 'abc' })).toEqual({ externalId: 'abc' });
    expect(
      parseNotification({
        sys_id: 'abc',
        sys_updated_on: 'a'.repeat(MAX_NOTIFICATION_TIMESTAMP_LENGTH + 1),
      })
    ).toEqual({ externalId: 'abc' });
  });

  it.each([
    ['a non-object body', null],
    ['an array body', [{ sys_id: 'abc' }]],
    ['a body without a sys_id', { number: 'INC0010001' }],
    ['a numeric sys_id', { sys_id: 1 }],
    ['a Jira body', { issue: { id: '10001' } }],
  ])('returns null for %s', (_, body) => {
    expect(parseNotification(body)).toBeNull();
  });
});
