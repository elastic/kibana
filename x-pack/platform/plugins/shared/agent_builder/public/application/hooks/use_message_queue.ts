/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_QUEUE = 3;

/**
 * Holds a queue of pending messages (max 3) that are sent one-at-a-time
 * after the current agent response finishes. When isResponseLoading transitions
 * from true to false, the first queued message is dequeued and passed to onDrain.
 */
export const useMessageQueue = ({
  isResponseLoading,
  onDrain,
}: {
  isResponseLoading: boolean;
  onDrain: (message: string) => void;
}) => {
  const [queue, setQueue] = useState<string[]>([]);

  const onDrainRef = useRef(onDrain);
  onDrainRef.current = onDrain;

  // Keep a ref so the effect below always sees the latest queue without it
  // being a reactive dependency (avoids draining more than once per cycle).
  const queueRef = useRef<string[]>([]);
  queueRef.current = queue;

  const wasLoadingRef = useRef(isResponseLoading);

  useEffect(() => {
    const wasLoading = wasLoadingRef.current;
    wasLoadingRef.current = isResponseLoading;

    if (wasLoading && !isResponseLoading && queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      setQueue(rest);
      onDrainRef.current(next);
    }
  }, [isResponseLoading]);

  const enqueue = useCallback((message: string) => {
    setQueue((prev) => (prev.length >= MAX_QUEUE ? prev : [...prev, message]));
  }, []);

  const remove = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    queue,
    enqueue,
    remove,
    isFull: queue.length >= MAX_QUEUE,
    maxQueue: MAX_QUEUE,
  };
};
