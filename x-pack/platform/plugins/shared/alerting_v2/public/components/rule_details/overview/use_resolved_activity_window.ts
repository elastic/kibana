/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { resolveGteLte, type ResolvedActivityWindow } from './time_range';

const boundsEqual = (a: ResolvedActivityWindow, b: ResolvedActivityWindow): boolean =>
  a.windowStartMs === b.windowStartMs && a.windowEndMs === b.windowEndMs;

/**
 * Re-resolves `from`/`to` and reports whether the absolute window moved.
 * Callers should apply `next` when `boundsChanged`, and refetch otherwise.
 */
export const resolveRefreshWindow = (
  from: string,
  to: string,
  current: ResolvedActivityWindow
): { next: ResolvedActivityWindow; boundsChanged: boolean } => {
  const next = resolveGteLte(from, to);
  return { next, boundsChanged: !boundsEqual(next, current) };
};

/**
 * Keeps a resolved activity window in sync with the selected range and refresh.
 * Relative ranges (`now-*`) get new bounds on refresh; absolute ranges refetch.
 */
export const useResolvedActivityWindow = (
  from: string,
  to: string
): {
  windowStartMs: number;
  windowEndMs: number;
  applyRefresh: (refetch: () => void) => void;
} => {
  const [input, setInput] = useState({ from, to });
  const [resolved, setResolved] = useState(() => resolveGteLte(from, to));

  if (from !== input.from || to !== input.to) {
    setInput({ from, to });
    setResolved(resolveGteLte(from, to));
  }

  const applyRefresh = useCallback(
    (refetch: () => void) => {
      const { next, boundsChanged } = resolveRefreshWindow(from, to, resolved);
      if (boundsChanged) {
        setResolved(next);
        return;
      }
      refetch();
    },
    [from, to, resolved]
  );

  return { ...resolved, applyRefresh };
};
