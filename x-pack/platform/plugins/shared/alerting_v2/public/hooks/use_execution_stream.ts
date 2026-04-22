/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { defer } from 'rxjs';
import type { Subscription } from 'rxjs';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { useService, CoreStart } from '@kbn/core-di-browser';
import type { ExecutionSummary } from '../services/rule_doctor_api';

interface ExecutionUpdateEvent {
  type: 'executionUpdate';
  executions: ExecutionSummary[];
}

export const useExecutionStream = () => {
  const http = useService(CoreStart('http'));
  const [executions, setExecutions] = useState<ExecutionSummary[] | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const subscriptionRef = useRef<Subscription | null>(null);
  const mountedRef = useRef(true);

  const disconnect = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    if (mountedRef.current) {
      setIsStreaming(false);
    }
  }, []);

  const connect = useCallback(() => {
    disconnect();
    setIsStreaming(true);

    const subscription = defer(() =>
      http.get('/internal/alerting/v2/rule_doctor/executions/_stream', {
        asResponse: true,
        rawResponse: true,
      })
    )
      .pipe(httpResponseIntoObservable<ExecutionUpdateEvent>())
      .subscribe({
        next: (event) => {
          if (mountedRef.current) {
            setExecutions(event.executions);
          }
        },
        error: () => {
          if (mountedRef.current) {
            setIsStreaming(false);
          }
        },
        complete: () => {
          if (mountedRef.current) {
            setIsStreaming(false);
          }
        },
      });

    subscriptionRef.current = subscription;
  }, [http, disconnect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return { executions, isStreaming, reconnect: connect };
};
