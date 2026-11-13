/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { formatConversationDate } from './format_conversation_date';

describe('formatConversationDate', () => {
  const now = moment('2026-11-11T12:00:00.000Z');

  afterEach(() => {
    moment.tz.setDefault();
  });

  it('shows month and day for dates in the current year', () => {
    expect(formatConversationDate('2026-06-03T10:00:00.000Z', now, 'en')).toBe('Jun 03');
  });

  it('adds the year for older dates', () => {
    expect(formatConversationDate('2025-06-03T10:00:00.000Z', now, 'en')).toBe('Jun 03, 2025');
  });

  it('follows the active locale', () => {
    expect(formatConversationDate('2025-06-03T10:00:00.000Z', now, 'de-DE')).toBe('03. Juni 2025');
  });

  it('uses the Kibana time zone instead of the browser one', () => {
    moment.tz.setDefault('Asia/Tokyo');

    expect(formatConversationDate('2026-06-03T18:00:00.000Z', moment(), 'en')).toBe('Jun 04');
  });
});
