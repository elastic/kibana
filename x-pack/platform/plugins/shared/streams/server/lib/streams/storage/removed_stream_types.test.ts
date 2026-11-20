/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotFoundError } from '@kbn/es-errors';
import {
  isRemovedStreamTypeDefinition,
  RemovedStreamTypeNotFoundError,
} from './removed_stream_types';

describe('isRemovedStreamTypeDefinition', () => {
  it.each([
    ['a query stream', { name: 'logs.q', type: 'query', query: { view: '$.logs.q', esql: '' } }],
    ['an untyped query stream', { name: 'logs.q', query: { view: '$.logs.q', esql: '' } }],
    [
      'a draft wired stream',
      {
        name: 'logs.d',
        type: 'wired',
        ingest: { wired: { fields: {}, routing: [], draft: true } },
      },
    ],
  ])('returns true for %s', (_label, definition) => {
    expect(isRemovedStreamTypeDefinition(definition)).toBe(true);
  });

  it.each([
    ['a wired stream', { name: 'logs.w', ingest: { wired: { fields: {}, routing: [] } } }],
    [
      'a materialized wired stream',
      { name: 'logs.w', ingest: { wired: { fields: {}, routing: [], draft: false } } },
    ],
    ['a classic stream', { name: 'logs-c-default', ingest: { classic: {} } }],
    ['a missing source', undefined],
  ])('returns false for %s', (_label, definition) => {
    expect(isRemovedStreamTypeDefinition(definition)).toBe(false);
  });
});

describe('RemovedStreamTypeNotFoundError', () => {
  it('is an Elasticsearch not-found error', () => {
    expect(isNotFoundError(new RemovedStreamTypeNotFoundError())).toBe(true);
  });
});
