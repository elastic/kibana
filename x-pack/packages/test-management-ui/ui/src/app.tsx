/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback } from 'react';
import type { DiscoveredConfigs, TestRunResult, PRInfo, ChangedFilesInfo } from './types.js';
import { api } from './api.js';
import { ConfigsPage } from './pages/configs.js';
import { useEventStream } from './hooks/use_event_stream.js';
import { useServers } from './hooks/use_servers.js';

export const App = () => {
  const [configs, setConfigs] = useState<DiscoveredConfigs | null>(null);
  const [runs, setRuns] = useState<TestRunResult[]>([]);
  const [prInfo, setPrInfo] = useState<PRInfo | null>(null);
  const [changedFiles, setChangedFiles] = useState<ChangedFilesInfo | null>(null);
  const { events, connected, subscribe } = useEventStream();
  const serverState = useServers(subscribe);

  useEffect(() => {
    api.get<DiscoveredConfigs>('/api/configs').then((data) => {
      if (data.totalCount > 0 || data.discoveryStatus !== 'idle') {
        setConfigs(data);
      }
    });
    api.get<{ pr: PRInfo | null }>('/api/pr').then((data) => {
      setPrInfo(data.pr);
    });
    api.get<ChangedFilesInfo>('/api/changed-files').then((data) => {
      if (data.changedFiles) setChangedFiles(data);
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

  const handleRunTest = async (configId: string, extraArgs?: string[], repeat?: number) => {
    await api.post('/api/runs', { configId, extraArgs, repeat: repeat ?? 1 });
    const data = await api.get<{ runs: TestRunResult[] }>('/api/runs');
    setRuns(data.runs ?? []);
  };

  const handleRunTestFile = async (testFile: string, configId: string) => {
    await api.post('/api/runs/test-file', { testFile, configId });
    const data = await api.get<{ runs: TestRunResult[] }>('/api/runs');
    setRuns(data.runs ?? []);
  };

  const handleStopRun = async (runId: string) => {
    await api.post(`/api/runs/${runId}/stop`);
    const data = await api.get<{ runs: TestRunResult[] }>('/api/runs');
    setRuns(data.runs ?? []);
  };

  const handleRefreshPr = useCallback(async () => {
    const data = await api.post<{ pr: PRInfo | null }>('/api/pr/refresh');
    setPrInfo(data.pr);
  }, []);

  const isDiscovering = configs?.discoveryStatus === 'discovering';

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar-left">
          <span className="top-bar-logo">Test Management</span>
          {isDiscovering && (
            <span className="top-bar-discovering">
              <span className="spinner-sm" />
              Discovering{configs?.discoveryPhase ? ` ${configs.discoveryPhase}` : ''}...
            </span>
          )}
        </div>
        <div className="top-bar-right">
          <span className="connection-dot" data-connected={connected} />
          <span className="top-bar-status">{connected ? 'Connected' : 'Disconnected'}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => api.post('/api/configs/refresh')}
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="main-content">
        <ConfigsPage
          configs={configs}
          runs={runs}
          events={events}
          servers={serverState.servers}
          esOutput={serverState.esOutput}
          kbnOutput={serverState.kbnOutput}
          prInfo={prInfo}
          changedFiles={changedFiles}
          onRunTest={handleRunTest}
          onRunTestFile={handleRunTestFile}
          onStopRun={handleStopRun}
          onStartES={serverState.startES}
          onStartKbn={serverState.startKbn}
          onStopES={serverState.stopES}
          onStopKbn={serverState.stopKbn}
          onRefreshPr={handleRefreshPr}
        />
      </main>
    </div>
  );
};
