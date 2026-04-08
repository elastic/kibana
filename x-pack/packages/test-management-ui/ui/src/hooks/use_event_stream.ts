/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { StreamEvent } from '../types.js';

type Listener = (event: StreamEvent) => void;

export interface EventStream {
  events: StreamEvent[];
  connected: boolean;
  subscribe: (fn: Listener) => () => void;
}

export const useEventStream = (): EventStream => {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<Set<Listener>>(new Set());

  useEffect(() => {
    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as StreamEvent;
      if (data.type === 'connected') {
        setConnected(true);
        return;
      }
      setEvents((prev) => [...prev.slice(-500), data]);
      listenersRef.current.forEach((fn) => fn(data));
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  const subscribe = useCallback((fn: Listener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  return { events, connected, subscribe };
};
