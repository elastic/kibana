/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job } from '../../common';
import { isUpcoming, jobFiresText, jobKindText } from './jobs';
import { createJobBody, createdMessage, newJobErrors } from './new_job';

const NOW = Date.parse('2026-11-02T15:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const QUERY = 'FROM logs-* | LIMIT 1';

describe('newJobErrors', () => {
  it('accepts a plain query', () => {
    expect(newJobErrors({ query: QUERY }, NOW)).toEqual({ errors: {}, valid: true });
  });

  it('requires a query', () => {
    expect(newJobErrors({ query: '  ' }, NOW)).toMatchObject({
      errors: { query: 'Enter a query' },
      valid: false,
    });
  });

  it('accepts every from 1 second to 24 hours, in whole seconds', () => {
    for (const every of ['1', '30', '86400']) {
      expect(newJobErrors({ query: QUERY, every }, NOW).valid).toBe(true);
    }
    for (const every of ['', '0', '1.5', '86401', 'ten']) {
      expect(newJobErrors({ query: QUERY, every }, NOW).errors.every).toBe(
        'Enter whole seconds from 1 to 86400'
      );
    }
  });

  it('accepts a runAt up to 30 days ahead', () => {
    expect(newJobErrors({ query: QUERY, runAtMs: NOW + 29 * DAY_MS }, NOW).valid).toBe(true);
    expect(newJobErrors({ query: QUERY, runAtMs: NOW + 31 * DAY_MS }, NOW).errors.runAt).toBe(
      'Pick a time at most 30 days ahead'
    );
    expect(newJobErrors({ query: QUERY, runAtMs: null }, NOW).errors.runAt).toBe(
      'Pick a date and time'
    );
  });
});

describe('createJobBody', () => {
  it('sends only the query and idempotency key for Run now', () => {
    expect(createJobBody({ query: ` ${QUERY} ` }, 'kbn-1')).toEqual({
      query: QUERY,
      idempotencyKey: 'kbn-1',
    });
  });

  it('sends everySeconds and runAt when they are on', () => {
    expect(createJobBody({ query: QUERY, every: '10', runAtMs: NOW }, 'kbn-2')).toEqual({
      query: QUERY,
      everySeconds: 10,
      runAt: '2026-11-02T15:00:00.000Z',
      idempotencyKey: 'kbn-2',
    });
  });
});

describe('createdMessage', () => {
  it('points at the queued task of a job that fired right away', () => {
    expect(createdMessage({ query: QUERY }, { jobId: 'job_a', taskId: 'job_a:1' })).toEqual({
      title: 'Created one-shot job job_a',
      text: 'Task job_a:1 is queued.',
    });
  });

  it('says when a scheduled job fires instead of naming a task', () => {
    const message = createdMessage(
      { query: QUERY, everySeconds: 10 },
      { jobId: 'job_b', taskId: null }
    );
    expect(message).toEqual({
      title: 'Created scheduled job job_b',
      text: 'It fires every 10s, first in 10s.',
    });
  });

  it('names the first occurrence of a scheduled job with runAt', () => {
    const { text } = createdMessage(
      { query: QUERY, everySeconds: 60, runAt: '2026-11-02T15:00:00.000Z' },
      { jobId: 'job_c', taskId: null }
    );
    expect(text).toMatch(/^It fires every 60s, first at Nov 2, \d\d:00:00\.$/);
  });

  it('says when a one-shot runAt job fires', () => {
    const { title, text } = createdMessage(
      { query: QUERY, runAt: '2026-11-02T15:00:00.000Z' },
      { jobId: 'job_d', taskId: null }
    );
    expect(title).toBe('Created one-shot job job_d');
    expect(text).toMatch(/^It fires once at Nov 2, \d\d:00:00\.$/);
  });
});

describe('jobs helpers', () => {
  const job = (overrides: Partial<Job>): Job =>
    ({ jobId: 'job_x', every: null, runAt: null, nextFireAt: null, ...overrides } as Job);

  it('treats scheduled jobs and pending runAt jobs as upcoming', () => {
    expect(isUpcoming(job({ every: '10s' }))).toBe(true);
    expect(
      isUpcoming(job({ runAt: '2026-11-03T00:00:00Z', nextFireAt: '2026-11-03T00:00:00Z' }))
    ).toBe(true);
    expect(isUpcoming(job({}))).toBe(false);
  });

  it('describes how a job fires', () => {
    expect(jobFiresText(job({ every: '10s' }))).toBe('every 10s');
    expect(jobFiresText(job({}))).toBe('once');
    expect(jobKindText(job({ every: '10s' }))).toBe('every 10s');
    expect(jobKindText(job({}))).toBe('one-shot');
    expect(jobKindText(undefined)).toBeUndefined();
  });
});
