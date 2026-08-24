/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  IMPROVEMENTS_INTERNAL_API_VERSION,
} from '../../../common/constants';
import { approveImprovement, listImprovements, rejectImprovement } from './improvements';

describe('listImprovements', () => {
  // No `status` in the query is deliberate: the route then applies its own default of the
  // statuses still awaiting the user.
  it('requests the versioned per-index endpoint with the default page size', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ improvements: [], total: 0 });

    await listImprovements(http, { aiIndexId: 'my-index' });

    expect(http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/my-index/improvements',
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        query: { from: 0, size: DEFAULT_IMPROVEMENTS_PAGE_SIZE },
      }
    );
  });

  it('passes through the status filter, pagination, and the abort signal', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ improvements: [], total: 0 });
    const signal = new AbortController().signal;

    await listImprovements(http, {
      aiIndexId: 'my-index',
      status: ['applied', 'rejected'],
      from: 25,
      size: 50,
      signal,
    });

    expect(http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/my-index/improvements',
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        query: { from: 25, size: 50, status: ['applied', 'rejected'] },
        signal,
      }
    );
  });
});

describe('approveImprovement', () => {
  it('posts to the approve endpoint for the given suggestion', async () => {
    const http = coreMock.createStart().http;
    http.post.mockResolvedValue({ improvement: {} });

    await approveImprovement(http, { improvementId: 'imp-1' });

    expect(http.post).toHaveBeenCalledWith('/internal/context_engine/improvements/imp-1/_approve', {
      version: IMPROVEMENTS_INTERNAL_API_VERSION,
    });
  });
});

describe('rejectImprovement', () => {
  it('posts to the reject endpoint for the given suggestion', async () => {
    const http = coreMock.createStart().http;
    http.post.mockResolvedValue({ improvement: {} });

    await rejectImprovement(http, { improvementId: 'imp-1' });

    expect(http.post).toHaveBeenCalledWith('/internal/context_engine/improvements/imp-1/_reject', {
      version: IMPROVEMENTS_INTERNAL_API_VERSION,
    });
  });
});
