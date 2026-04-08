/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { DiscoveredConfigs, TestRunResult, PageId } from './types.js';
import { api } from './api.js';
import { useEventStream } from './hooks/use_event_stream.js';
import { useServers } from './hooks/use_servers.js';
import { DashboardPage } from './pages/dashboard.js';
import { ConfigsPage } from './pages/configs.js';

export const App = () => {
  const [page, setPage] = useState<PageId>('configs');
  const [configs, setConfigs] = useState<DiscoveredConfigs | null>(null);
  const [runs, setRuns] = useState<TestRunResult[]>([]);
  const { events, connected, subscribe } = useEventStream();
  const serverState = useServers(subscribe);

  useEffect(() => {
    api.get<DiscoveredConfigs>('/api/configs').then((data) => {
      if (data.totalCount > 0 || data.discoveryStatus !== 'idle') {
        setConfigs(data);
      }
    });
  }, []);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === 'config-update') {
        const incoming = (event as unknown as { configs: DiscoveredConfigs }).configs;
        if (incoming) {
          setConfigs(incoming);
        }
      }
      if (event.type === 'complete' || event.type === 'status') {
        api.get<{ runs: TestRunResult[] }>('/api/runs').then((data) => {
          setRuns(data.runs ?? []);
        });
      }
    });
  }, [subscribe]);

  useEffect(() => {
    const poll = setInterval(() => {
      api.get<{ runs: TestRunResult[] }>('/api/runs').then((data) => {
        setRuns(data.runs ?? []);
      });
    }, 3000);
    return () => clearInterval(poll);
  }, []);

  const handleRunTest = async (configId: string) => {
    await api.post('/api/runs', { configId });
    const data = await api.get<{ runs: TestRunResult[] }>('/api/runs');
    setRuns(data.runs ?? []);
  };

  const handleStopRun = async (runId: string) => {
    await api.post(`/api/runs/${runId}/stop`);
    const data = await api.get<{ runs: TestRunResult[] }>('/api/runs');
    setRuns(data.runs ?? []);
  };

  const activeRuns = runs.filter((r) => r.status === 'running' || r.status === 'starting');

  return (
    <div>
      <div className="sidebar">
        <h2>Test Management</h2>
        <nav className="sidebar-nav">
          <a className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>
            Dashboard
          </a>
          <a className={page === 'configs' ? 'active' : ''} onClick={() => setPage('configs')}>
            Test Configs {activeRuns.length > 0 && `(${activeRuns.length} running)`}
          </a>
        </nav>
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <div className="flex-row text-small">
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: connected ? '#017d73' : '#bd271e',
              }}
            />
            <span style={{ color: '#98a2b3' }}>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      <div className="main-content">
        {page === 'dashboard' && <DashboardPage configs={configs} runs={runs} />}
        {page === 'configs' && (
          <ConfigsPage
            configs={configs}
            runs={runs}
            events={events}
            servers={serverState.servers}
            esOutput={serverState.esOutput}
            kbnOutput={serverState.kbnOutput}
            onRunTest={handleRunTest}
            onStopRun={handleStopRun}
            onStartES={serverState.startES}
            onStartKbn={serverState.startKbn}
            onStopES={serverState.stopES}
            onStopKbn={serverState.stopKbn}
          />
        )}
      </div>
    </div>
  );
};
