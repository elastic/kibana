/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveredConfigs, TestRunResult } from '../types.js';
import { StatusBadge } from '../components/status_badge.js';

interface DashboardPageProps {
  configs: DiscoveredConfigs | null;
  runs: TestRunResult[];
}

export const DashboardPage = ({ configs, runs }: DashboardPageProps) => {
  const activeRuns = runs.filter((r) => r.status === 'running' || r.status === 'starting');
  const passedRuns = runs.filter((r) => r.status === 'passed');
  const failedRuns = runs.filter((r) => r.status === 'failed');

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: 24 }}>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="number">{configs?.totalCount ?? '...'}</div>
          <div className="label">Total Configs</div>
        </div>
        <div className="stat-card">
          <div className="number" style={{ color: '#006bb4' }}>
            {activeRuns.length}
          </div>
          <div className="label">Active Runs</div>
        </div>
        <div className="stat-card">
          <div className="number" style={{ color: '#017d73' }}>
            {passedRuns.length}
          </div>
          <div className="label">Passed</div>
        </div>
        <div className="stat-card">
          <div className="number" style={{ color: '#bd271e' }}>
            {failedRuns.length}
          </div>
          <div className="label">Failed</div>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="number">{configs?.jest.length ?? 0}</div>
          <div className="label">Jest Configs</div>
        </div>
        <div className="stat-card">
          <div className="number">{configs?.jestIntegration.length ?? 0}</div>
          <div className="label">Jest Integration</div>
        </div>
        <div className="stat-card">
          <div className="number">{configs?.scout.length ?? 0}</div>
          <div className="label">Scout Configs</div>
        </div>
        <div className="stat-card">
          <div className="number">{configs?.ftr.length ?? 0}</div>
          <div className="label">FTR Configs</div>
        </div>
      </div>

      {activeRuns.length > 0 && (
        <div className="mt-16">
          <h3 className="mb-8">Active Runs</h3>
          {activeRuns.map((run) => (
            <div key={run.id} className="card flex-between">
              <div className="flex-row">
                <StatusBadge status={run.status} />
                <span className="mono text-small">{run.configId}</span>
              </div>
              <span className="text-muted text-small">
                {new Date(run.startedAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
