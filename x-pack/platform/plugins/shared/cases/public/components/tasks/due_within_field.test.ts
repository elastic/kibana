/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dueDateFromDraft } from './due_within_field';

describe('dueDateFromDraft', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('adds the chosen amount of time to now', () => {
    expect(dueDateFromDraft({ value: '45', unit: 'minutes' }, now)).toBe(
      '2026-01-01T00:45:00.000Z'
    );
    expect(dueDateFromDraft({ value: '2', unit: 'hours' }, now)).toBe('2026-01-01T02:00:00.000Z');
    expect(dueDateFromDraft({ value: '3', unit: 'days' }, now)).toBe('2026-01-04T00:00:00.000Z');
  });

  it('treats an empty or non-positive value as no deadline', () => {
    expect(dueDateFromDraft({ value: '', unit: 'hours' }, now)).toBeNull();
    expect(dueDateFromDraft({ value: '0', unit: 'hours' }, now)).toBeNull();
    expect(dueDateFromDraft({ value: '-1', unit: 'days' }, now)).toBeNull();
  });
});
