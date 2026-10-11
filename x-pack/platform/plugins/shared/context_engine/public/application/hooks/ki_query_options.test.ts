/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { KI_LIFECYCLE_STATUSES } from '../../../common/step_types/ki';
import { VIEW_KI_QUERY_STALE_TIME_MS, createKiQueryOptions } from './ki_query_options';

describe('createKiQueryOptions', () => {
  const http = coreMock.createStart().http;

  it('returns the viewKi query key and stale time', () => {
    const options = createKiQueryOptions(http, {
      aiIndexId: 'sample-ki',
      kiId: 'ki-1',
      index: 'ai-index-idx-sample-ki',
    });

    expect(options.queryKey).toEqual([
      'context_engine',
      'ai_index',
      'sample-ki',
      'ki',
      'ai-index-idx-sample-ki',
      'ki-1',
      'active,deleted',
    ]);
    expect(options.staleTime).toBe(VIEW_KI_QUERY_STALE_TIME_MS);
  });

  it('queryFn requests getKi with lifecycle statuses and signal', async () => {
    const response = { id: 'ki-1', document: { title: 'Example' } };
    http.get.mockResolvedValue(response);
    const signal = new AbortController().signal;

    const { queryFn } = createKiQueryOptions(http, {
      aiIndexId: 'sample-ki',
      kiId: 'ki-1',
      index: 'ai-index-idx-sample-ki',
    });

    const result = await queryFn({ signal });

    expect(result).toEqual(response);
    expect(http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/sample-ki/kis/ki-1',
      expect.objectContaining({
        version: '1',
        query: {
          index: 'ai-index-idx-sample-ki',
          lifecycle_status: [...KI_LIFECYCLE_STATUSES],
        },
        signal,
      })
    );
  });
});
