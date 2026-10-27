/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { assigneeSignal } from './assignee_overrides';

/**
 * Subscribes to the cross-boundary assignee signal and calls `onBump` with the
 * conversation ids whose version counter changed since the last render.
 *
 * Skips the mount render so that `onBump` only fires for genuine post-mount bumps.
 * `onBump` is held in a ref, so callers do not need to memoise it.
 */
export function useAssigneeSignal(onBump: (changedIds: string[]) => void): void {
  const onBumpRef = useRef(onBump);
  onBumpRef.current = onBump;

  const snapshot = useSyncExternalStore(assigneeSignal.subscribe, assigneeSignal.getSnapshot);
  const prevSnapshotRef = useRef<ReadonlyMap<string, number> | null>(null);

  useEffect(() => {
    const prev = prevSnapshotRef.current;
    prevSnapshotRef.current = snapshot;
    if (prev === null) return; // skip mount

    const changedIds: string[] = [];
    for (const [id, version] of snapshot) {
      if ((prev.get(id) ?? 0) !== version) changedIds.push(id);
    }
    if (changedIds.length > 0) onBumpRef.current(changedIds);
  }, [snapshot]);
}
