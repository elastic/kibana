/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

const TOKEN_DELAY_MS = 17; // one token per frame at 60 fps

export interface UseStreamingTextResult {
  displayed: string;
  /** True once all queued tokens have been rendered and the animation is idle. */
  isComplete: boolean;
}

/**
 * Progressively reveals `text` word-by-word at ~60 fps, matching the
 * typewriter effect used in AgentBuilder's StreamingText component.
 * The full text is queued on first render and drained via setInterval.
 */
export function useStreamingText(text: string): UseStreamingTextResult {
  const [displayed, setDisplayed] = useState('');
  const queueRef = useRef<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    const newContent = text.slice(prevLengthRef.current);
    if (newContent.length > 0) {
      const tokens = newContent.split(/(\s+)/).filter((t) => t.length > 0);
      queueRef.current.push(...tokens);
      prevLengthRef.current = text.length;
    }

    if (!intervalRef.current && queueRef.current.length > 0) {
      intervalRef.current = setInterval(() => {
        if (queueRef.current.length === 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return;
        }
        const next = queueRef.current.shift()!;
        setDisplayed((prev) => prev + next);
      }, TOKEN_DELAY_MS);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text]);

  return { displayed, isComplete: text.length > 0 && displayed === text };
}
