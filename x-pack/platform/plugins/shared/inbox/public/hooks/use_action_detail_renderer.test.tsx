/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { InboxActionDetailRenderer, InboxActionDetailRendererLoader } from '../types';
import { InboxDetailRendererProvider, useActionDetailRenderer } from './use_action_detail_renderer';

const RendererA: InboxActionDetailRenderer = () => <span data-test-subj="A" />;
RendererA.displayName = 'RendererA';

const RendererB: InboxActionDetailRenderer = () => <span data-test-subj="B" />;
RendererB.displayName = 'RendererB';

interface DeferredLoader {
  loader: InboxActionDetailRendererLoader;
  resolve: (renderer: InboxActionDetailRenderer) => void;
  reject: (err: Error) => void;
}

const deferred = (): DeferredLoader => {
  let resolve!: (renderer: InboxActionDetailRenderer) => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<InboxActionDetailRenderer>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { loader: () => promise, resolve, reject };
};

const wrapperFor = (
  renderers: Map<string, InboxActionDetailRendererLoader>
): FC<PropsWithChildren<{}>> => {
  return ({ children }) => (
    <InboxDetailRendererProvider renderers={renderers}>{children}</InboxDetailRendererProvider>
  );
};

describe('useActionDetailRenderer', () => {
  it('returns null when no renderer is registered for the source_app', async () => {
    const { result } = renderHook(() => useActionDetailRenderer('unknown'), {
      wrapper: wrapperFor(new Map()),
    });
    expect(result.current).toBeNull();
  });

  it('lazy-resolves and returns the registered renderer', async () => {
    const a = deferred();
    const renderers = new Map<string, InboxActionDetailRendererLoader>([['workflows', a.loader]]);

    const { result } = renderHook(() => useActionDetailRenderer('workflows'), {
      wrapper: wrapperFor(renderers),
    });

    expect(result.current).toBeNull();

    await act(async () => {
      a.resolve(RendererA);
    });

    await waitFor(() => expect(result.current).toBe(RendererA));
  });

  it('clears the previous renderer immediately when sourceApp changes (regression)', async () => {
    // Without the explicit reset in the effect, this test would observe
    // RendererA still mounted while the loader for `evals` is in-flight,
    // pairing the old renderer with the new action. See the doc comment
    // in `use_action_detail_renderer.tsx` for the underlying bug.
    const a = deferred();
    const b = deferred();
    const renderers = new Map<string, InboxActionDetailRendererLoader>([
      ['workflows', a.loader],
      ['evals', b.loader],
    ]);

    const { result, rerender } = renderHook(
      ({ sourceApp }: { sourceApp: string }) => useActionDetailRenderer(sourceApp),
      {
        wrapper: wrapperFor(renderers),
        initialProps: { sourceApp: 'workflows' },
      }
    );

    await act(async () => {
      a.resolve(RendererA);
    });
    await waitFor(() => expect(result.current).toBe(RendererA));

    rerender({ sourceApp: 'evals' });

    expect(result.current).toBeNull();

    await act(async () => {
      b.resolve(RendererB);
    });
    await waitFor(() => expect(result.current).toBe(RendererB));
  });

  it('falls back to null and logs when the loader rejects', async () => {
    const a = deferred();
    const renderers = new Map<string, InboxActionDetailRendererLoader>([['workflows', a.loader]]);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useActionDetailRenderer('workflows'), {
      wrapper: wrapperFor(renderers),
    });

    await act(async () => {
      a.reject(new Error('chunk load failed'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed to load detail renderer'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
