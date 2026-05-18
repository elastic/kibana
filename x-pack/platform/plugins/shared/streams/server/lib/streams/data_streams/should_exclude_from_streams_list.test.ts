/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { shouldExcludeFromStreamsList } from './should_exclude_from_streams_list';

const createDataStream = (
  overrides: Partial<Pick<IndicesDataStream, 'name' | 'hidden' | '_meta'>>
): Pick<IndicesDataStream, 'name' | 'hidden' | '_meta'> => ({
  name: 'logs-nginx-default',
  hidden: false,
  ...overrides,
});

describe('shouldExcludeFromStreamsList', () => {
  it('includes normal user-facing data streams', () => {
    expect(shouldExcludeFromStreamsList(createDataStream({ name: 'logs-nginx-default' }))).toBe(
      false
    );
  });

  it('excludes hidden data streams with a dot prefix', () => {
    expect(
      shouldExcludeFromStreamsList(createDataStream({ name: '.some-stream', hidden: true }))
    ).toBe(true);
    expect(
      shouldExcludeFromStreamsList(
        createDataStream({
          name: '.workflows-execution-data-stream-logs',
          hidden: true,
        })
      )
    ).toBe(true);
  });

  it('excludes hidden data streams without a dot prefix', () => {
    expect(
      shouldExcludeFromStreamsList(createDataStream({ name: 'some-stream', hidden: true }))
    ).toBe(true);
  });

  it('excludes managed data streams with a dot prefix', () => {
    expect(
      shouldExcludeFromStreamsList(
        createDataStream({ name: '.some-stream', _meta: { managed: true } })
      )
    ).toBe(true);
    expect(
      shouldExcludeFromStreamsList(
        createDataStream({
          name: '.workflows-execution-data-stream-logs',
          hidden: true,
        })
      )
    ).toBe(true);
  });

  it('excludes managed data streams without a dot prefix', () => {
    expect(
      shouldExcludeFromStreamsList(
        createDataStream({ name: 'some-stream', _meta: { managed: true } })
      )
    ).toBe(true);
  });
});
