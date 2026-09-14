/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

export type LoadListGetFn<TItem> = (opts?: { signal?: AbortSignal }) => Promise<TItem[]>;

export interface LoadListResult<TItem> {
  items: TItem[];
  hasLoaded: boolean;
  reload: () => Promise<void>;
}

export const useLoadList = <TItem>(get: LoadListGetFn<TItem>): LoadListResult<TItem> => {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [items, setItems] = useState<TItem[]>([]);

  const load = useCallback(
    async ({ signal }: { signal?: AbortSignal } = {}) => {
      try {
        const nextItems = await get({ signal });
        if (!signal?.aborted) {
          setItems(nextItems);
        }
      } catch {
        if (!signal?.aborted) {
          setItems([]);
        }
      } finally {
        if (!signal?.aborted) {
          setHasLoaded(true);
        }
      }
    },
    [get]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [load]);

  return {
    items,
    hasLoaded,
    reload: useCallback(() => load(), [load]),
  };
};
