/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { Observable } from 'rxjs';
import { RequestCancellationManager } from '@kbn/presentation-publishing';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';

import { useAiopsAppContext } from './use_aiops_app_context';
import { useCancellableSearch } from './use_cancellable_search';

jest.mock('./use_aiops_app_context');

// jsdom 20's AbortSignal does not implement AbortSignal.any, which current browsers do.
if (typeof AbortSignal.any !== 'function') {
  AbortSignal.any = (signals: AbortSignal[]): AbortSignal => {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }
    return controller.signal;
  };
}

describe('useCancellableSearch', () => {
  const search = jest.fn();

  beforeEach(() => {
    // Mimics `data.search.search`, which errors with an `AbortError` for aborted signals.
    search.mockImplementation(
      (_request, { abortSignal }: { abortSignal: AbortSignal }) =>
        new Observable((subscriber) => {
          const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
          if (abortSignal.aborted) {
            subscriber.error(abortError);
            return;
          }
          abortSignal.addEventListener('abort', () => subscriber.error(abortError));
          subscriber.next({ rawResponse: { ok: true } });
          subscriber.complete();
        })
    );
    (useAiopsAppContext as jest.Mock).mockReturnValue({ data: { search: { search } } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('runs requests without a request cancellation manager', async () => {
    const { result } = renderHook(() => useCancellableSearch());
    await expect(result.current.runRequest({ params: {} })).resolves.toEqual({
      rawResponse: { ok: true },
    });
  });

  it('resolves with null when the manager was cancelled before the request started', async () => {
    const manager = new RequestCancellationManager();
    manager.startLoad();
    manager.cancel(AbortReason.CANCELED);

    const { result } = renderHook(() => useCancellableSearch(manager));
    await expect(result.current.runRequest({ params: {} })).resolves.toBeNull();
  });

  it('runs requests again once a new load has started', async () => {
    const manager = new RequestCancellationManager();
    manager.startLoad();
    manager.cancel(AbortReason.CANCELED);

    const { result } = renderHook(() => useCancellableSearch(manager));
    await expect(result.current.runRequest({ params: {} })).resolves.toBeNull();

    manager.startLoad();
    await expect(result.current.runRequest({ params: {} })).resolves.toEqual({
      rawResponse: { ok: true },
    });
  });
});
