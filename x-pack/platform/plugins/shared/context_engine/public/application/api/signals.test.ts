/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  DEFAULT_SIGNALS_PAGE_SIZE,
  SIGNALS_INTERNAL_API_VERSION,
  signalGroupsPath,
  signalsPath,
} from '../../../common/constants';
import { listSignalGroups, listSignals } from './signals';

describe('listSignalGroups', () => {
  it('requests the versioned grouped endpoint', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ groups: [] });

    await listSignalGroups(http);

    expect(http.get).toHaveBeenCalledWith(signalGroupsPath, {
      version: SIGNALS_INTERNAL_API_VERSION,
    });
  });

  it('forwards the abort signal when provided', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ groups: [] });
    const signal = new AbortController().signal;

    await listSignalGroups(http, { signal });

    expect(http.get).toHaveBeenCalledWith(signalGroupsPath, {
      version: SIGNALS_INTERNAL_API_VERSION,
      signal,
    });
  });
});

describe('listSignals', () => {
  it('requests the versioned per-group endpoint with the default page size', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ signals: [], total: 0 });

    await listSignals(http, { tag: 'query_error' });

    expect(http.get).toHaveBeenCalledWith(signalsPath, {
      version: SIGNALS_INTERNAL_API_VERSION,
      query: { tag: 'query_error', from: 0, size: DEFAULT_SIGNALS_PAGE_SIZE },
    });
  });

  it('passes through pagination and the abort signal', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ signals: [], total: 0 });
    const signal = new AbortController().signal;

    await listSignals(http, { tag: 'coverage_gap', from: 25, size: 50, signal });

    expect(http.get).toHaveBeenCalledWith(signalsPath, {
      version: SIGNALS_INTERNAL_API_VERSION,
      query: { tag: 'coverage_gap', from: 25, size: 50 },
      signal,
    });
  });
});
