/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { formatConversationDate } from './format_conversation_date';

describe('formatConversationDate', () => {
  const now = moment('2026-11-11T12:00:00.000Z');

  it('shows month and day for dates in the current year', () => {
    expect(formatConversationDate('2026-06-03T10:00:00.000Z', now)).toBe('Jun 03');
  });

  it('adds the year for older dates', () => {
    expect(formatConversationDate('2025-06-03T10:00:00.000Z', now)).toBe('Jun 03, 2025');
  });
});
