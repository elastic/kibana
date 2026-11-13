/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, type MutableRefObject } from 'react';
import { useStoreApi } from '@xyflow/react';
import type { ReadHandleOffset } from './straight_edges';

export const readNoHandleOffset: ReadHandleOffset = () => undefined;

interface HandleOffsetReaderProps {
  /** Receives a reader of the handle positions React Flow measured, while this is mounted. */
  readerRef: MutableRefObject<ReadHandleOffset>;
}

/**
 * Hands the canvas, which renders outside the React Flow provider, a way to read
 * where each handle sits on its node. Render it inside the provider.
 */
export function HandleOffsetReader({ readerRef }: HandleOffsetReaderProps) {
  const store = useStoreApi();

  useEffect(() => {
    readerRef.current = (nodeId, type, handleId) => {
      const handles = store.getState().nodeLookup.get(nodeId)?.internals.handleBounds?.[type];
      const handle = handleId ? handles?.find(({ id }) => id === handleId) : handles?.[0];
      return handle ? handle.y + handle.height / 2 : undefined;
    };
    return () => {
      readerRef.current = readNoHandleOffset;
    };
  }, [readerRef, store]);

  return null;
}
