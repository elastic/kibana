/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { FlowThroughputPayload } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';

/**
 * Polls GET /internal/streams/_flow/throughput every `intervalMs` milliseconds
 * and returns the latest payload. Stops when `paused` is true or on unmount.
 */
export const useFlowThroughputPoll = (
  intervalMs: number = 5000,
  paused: boolean
): FlowThroughputPayload | null => {
  const { core } = useKibana();
  const [throughput, setThroughput] = useState<FlowThroughputPayload | null>(null);

  // Keep a stable ref so the interval callback always uses the latest core.http
  const httpRef = useRef(core.http);
  httpRef.current = core.http;

  useEffect(() => {
    if (paused) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const poll = async () => {
      const controller = new AbortController();

      try {
        const result = await httpRef.current.get<FlowThroughputPayload>(
          '/internal/streams/_flow/throughput',
          { signal: controller.signal }
        );
        if (!cancelled) {
          setThroughput(result);
        }
      } catch {
        // Silently ignore errors (network blip, abort) — next poll will retry
      }

      if (!cancelled) {
        timeoutId = setTimeout(poll, intervalMs);
      }

      return () => {
        controller.abort();
      };
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [intervalMs, paused]);

  return throughput;
};
