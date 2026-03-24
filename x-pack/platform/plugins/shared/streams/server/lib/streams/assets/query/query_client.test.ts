/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQuery } from '@kbn/streams-schema';
import { buildSearchEmbeddingText } from './query_client';

const createQuery = (overrides: Partial<StreamQuery> = {}): StreamQuery => ({
  id: 'test-query-id',
  title: 'SSH Brute Force Detection',
  description: 'Detects repeated failed SSH login attempts from a single source IP',
  esql: {
    query: 'FROM logs-* | WHERE event.action == "ssh_login" AND event.outcome == "failure"',
  },
  ...overrides,
});

describe('buildSearchEmbeddingText', () => {
  it('builds structured text with title and description', () => {
    const query = createQuery();
    const result = buildSearchEmbeddingText(query);

    expect(result).toBe(
      'Title: SSH Brute Force Detection\nDescription: Detects repeated failed SSH login attempts from a single source IP'
    );
  });

  it('includes only title when description is empty', () => {
    const query = createQuery({ description: '' });
    const result = buildSearchEmbeddingText(query);

    expect(result).toBe('Title: SSH Brute Force Detection');
  });

  it('includes only title when description is undefined', () => {
    const query = createQuery({ description: undefined });
    const result = buildSearchEmbeddingText(query);

    expect(result).toBe('Title: SSH Brute Force Detection');
  });

  it('handles special characters in title and description', () => {
    const query = createQuery({
      title: 'Alert: "Critical" <System> Failure',
      description: 'Triggers when error_rate > 0.5 && status_code != 200',
    });
    const result = buildSearchEmbeddingText(query);

    expect(result).toBe(
      'Title: Alert: "Critical" <System> Failure\nDescription: Triggers when error_rate > 0.5 && status_code != 200'
    );
  });
});
