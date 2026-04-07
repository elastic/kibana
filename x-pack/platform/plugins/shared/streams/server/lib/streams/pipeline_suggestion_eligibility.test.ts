/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { isStreamEligibleForPipelineSuggestion } from './pipeline_suggestion_eligibility';

const baseClassic = (
  overrides: Partial<Streams.ClassicStream.Definition> = {}
): Streams.all.Definition =>
  ({
    type: 'classic',
    name: 'logs-test-default',
    description: '',
    updated_at: new Date().toISOString(),
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      classic: {},
      failure_store: { inherit: {} },
    },
    ...overrides,
  } as Streams.ClassicStream.Definition);

describe('isStreamEligibleForPipelineSuggestion', () => {
  it('returns true for ingest stream with no processing steps', () => {
    expect(isStreamEligibleForPipelineSuggestion(baseClassic())).toBe(true);
  });

  it('returns false when processing steps exist', () => {
    const def = baseClassic({
      ingest: {
        lifecycle: { inherit: {} },
        processing: {
          steps: [{ action: 'grok', from: 'message', patterns: ['%{WORD:x}'] }],
          updated_at: new Date().toISOString(),
        },
        settings: {},
        classic: {},
        failure_store: { inherit: {} },
      },
    });
    expect(isStreamEligibleForPipelineSuggestion(def)).toBe(false);
  });

  it('returns false for query streams', () => {
    const queryStream: Streams.QueryStream.Definition = {
      type: 'query',
      name: 'q',
      description: '',
      updated_at: new Date().toISOString(),
      query: { view: 'logs_view', esql: 'FROM logs' },
    };
    expect(isStreamEligibleForPipelineSuggestion(queryStream)).toBe(false);
  });
});
