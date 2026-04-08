/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { ServerStatus, LogLine, StreamEvent } from '../types.js';
import { api } from '../api.js';

export interface ServerState {
  servers: ServerStatus[];
  esOutput: LogLine[];
  kbnOutput: LogLine[];
}

export interface ServerActions {
  startES: () => void;
  startKbn: () => void;
  stopES: () => void;
  stopKbn: () => void;
  stopAll: () => void;
}

export const useServers = (
  subscribe: (fn: (event: StreamEvent) => void) => () => void
): ServerState & ServerActions => {
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [esOutput, setEsOutput] = useState<LogLine[]>([]);
  const [kbnOutput, setKbnOutput] = useState<LogLine[]>([]);

  useEffect(() => {
    api.get<{ servers: ServerStatus[] }>('/api/servers').then((data) => {
      setServers(data.servers ?? []);
    });
  }, []);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === 'server-status') {
        api.get<{ servers: ServerStatus[] }>('/api/servers').then((data) => {
          setServers(data.servers ?? []);
        });
      }
      if (event.type === 'server-output') {
        const line: LogLine = {
          data: event.data ?? '',
          type: event.stream === 'stderr' ? 'error' : 'output',
        };
        if (event.name === 'elasticsearch') {
          setEsOutput((prev) => [...prev.slice(-500), line]);
        }
        if (event.name === 'kibana') {
          setKbnOutput((prev) => [...prev.slice(-500), line]);
        }
      }
    });
  }, [subscribe]);

  return {
    servers,
    esOutput,
    kbnOutput,
    startES: () => api.post('/api/servers/elasticsearch'),
    startKbn: () => api.post('/api/servers/kibana'),
    stopES: () => api.post('/api/servers/elasticsearch/stop'),
    stopKbn: () => api.post('/api/servers/kibana/stop'),
    stopAll: () => api.post('/api/servers/stop-all'),
  };
};
