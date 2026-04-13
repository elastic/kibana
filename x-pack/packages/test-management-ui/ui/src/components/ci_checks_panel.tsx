/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo } from 'react';
import type { TestConfig, TestRunResult, StreamEvent, LogLine } from '../types.js';
import { StatusBadge } from './status_badge.js';
import { LogViewer } from './log_viewer.js';
import { RunOptionsModal } from './run_options_modal.js';

interface CIChecksPanelProps {
  checks: TestConfig[];
  runs: TestRunResult[];
  events: StreamEvent[];
  ciFailedIds: Set<string>;
  changedLintableFiles?: string[];
  affectedTsProjects?: string[];
  onRun: (configId: string, extraArgs?: string[]) => void;
  onStop: (runId: string) => void;
}

const CheckRow = ({
  check,
  latestRun,
  runLines,
  ciFailedInPr,
  scopedFiles,
  scopedTsProjects,
  onRun,
  onStop,
}: {
  check: TestConfig;
  latestRun: TestRunResult | null;
  runLines: LogLine[];
  ciFailedInPr: boolean;
  scopedFiles?: string[];
  scopedTsProjects?: string[];
  onRun: (id: string, extraArgs?: string[]) => void;
  onStop: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const isRunning =
    latestRun?.status === 'running' || latestRun?.status === 'starting';
  const hasOptions = (check.runOptions ?? []).length > 0;

  const isEslint = check.configPath === 'eslint' || check.configPath === 'eslint_with_types';
  const isTypeCheck = check.configPath === 'check_types';
  const canScope =
    (isEslint && (scopedFiles?.length ?? 0) > 0) ||
    (isTypeCheck && (scopedTsProjects?.length ?? 0) > 0);

  const handleScopedRun = () => {
    if (isEslint && scopedFiles && scopedFiles.length > 0) {
      onRun(check.id, scopedFiles);
    } else if (isTypeCheck && scopedTsProjects && scopedTsProjects.length > 0) {
      for (const proj of scopedTsProjects) {
        onRun(check.id, ['--project', proj]);
      }
    }
  };

  const handleRunClick = () => {
    if (hasOptions) {
      setShowOptions(true);
    } else {
      onRun(check.id);
    }
  };

  const handleRunWithArgs = (extraArgs: string[]) => {
    setShowOptions(false);
    setExpanded(true);
    onRun(check.id, extraArgs);
  };

  return (
    <div className="ci-check-row">
      <div className="ci-check-header" onClick={() => setExpanded(!expanded)}>
        <span className="ci-check-expand">{expanded ? '▾' : '▸'}</span>
        <span className="ci-check-name">{check.name}</span>
        {ciFailedInPr && <span className="ci-badge ci-badge-failed">CI ✕</span>}
        {latestRun && <StatusBadge status={latestRun.status} />}
        <span className="ci-check-cmd mono text-muted">
          {check.command} {(check.commandArgs ?? []).join(' ')}
        </span>
        <div className="ci-check-actions" onClick={(e) => e.stopPropagation()}>
          {isRunning ? (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onStop(latestRun!.id)}
            >
              Stop
            </button>
          ) : (
            <div className="flex-row">
              {canScope && (
                <button
                  className="btn btn-sm"
                  style={{ background: '#d36086', color: 'white' }}
                  onClick={handleScopedRun}
                  title="Run scoped to changed files only"
                >
                  Scoped
                </button>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={handleRunClick}
              >
                Run{hasOptions ? ' ▾' : ''}
              </button>
              {hasOptions && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onRun(check.id)}
                  title="Run with defaults (no options)"
                >
                  ▶
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="ci-check-output">
          {runLines.length > 0 ? (
            <LogViewer lines={runLines} />
          ) : (
            <div className="text-muted" style={{ padding: 16, textAlign: 'center', fontSize: 13 }}>
              No output yet — run this check to see results.
            </div>
          )}
        </div>
      )}
      {showOptions && (
        <RunOptionsModal
          title={check.name}
          options={check.runOptions ?? []}
          onRun={handleRunWithArgs}
          onCancel={() => setShowOptions(false)}
        />
      )}
    </div>
  );
};

export const CIChecksPanel = ({
  checks,
  runs,
  events,
  ciFailedIds,
  changedLintableFiles,
  affectedTsProjects,
  onRun,
  onStop,
}: CIChecksPanelProps) => {
  const runsById = useMemo(() => {
    const map = new Map<string, TestRunResult[]>();
    for (const run of runs) {
      const existing = map.get(run.configId) ?? [];
      existing.push(run);
      map.set(run.configId, existing);
    }
    return map;
  }, [runs]);

  const linesForRun = (runId: string | undefined): LogLine[] => {
    if (!runId) return [];
    return events
      .filter(
        (e) =>
          e.runId === runId && (e.type === 'output' || e.type === 'error')
      )
      .map((e) => ({
        data: e.data ?? '',
        type: e.type === 'error' ? ('error' as const) : ('output' as const),
      }));
  };

  const activeCount = checks.filter((c) => {
    const r = runsById.get(c.id)?.[0];
    return r?.status === 'running' || r?.status === 'starting';
  }).length;

  const handleRunAll = () => {
    for (const c of checks) {
      const r = runsById.get(c.id)?.[0];
      if (r?.status !== 'running' && r?.status !== 'starting') {
        onRun(c.id);
      }
    }
  };

  const handleStopAll = () => {
    for (const c of checks) {
      const r = runsById.get(c.id)?.[0];
      if (r && (r.status === 'running' || r.status === 'starting')) {
        onStop(r.id);
      }
    }
  };

  const [collapsed, setCollapsed] = useState(true);

  const passedCount = checks.filter((c) => runsById.get(c.id)?.[0]?.status === 'passed').length;
  const failedCount = checks.filter((c) => runsById.get(c.id)?.[0]?.status === 'failed').length;
  const ciFailCount = checks.filter((c) => ciFailedIds.has(c.id)).length;

  if (checks.length === 0) return null;

  return (
    <div className="ci-checks-panel">
      <div
        className="ci-checks-header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex-row">
          <span className="ci-checks-expand">{collapsed ? '▸' : '▾'}</span>
          <h3 className="ci-checks-title">CI Checks</h3>
          <span className="ci-checks-summary text-muted text-small">
            {checks.length} checks
            {activeCount > 0 && <span className="ci-checks-tag ci-checks-tag-running">{activeCount} running</span>}
            {passedCount > 0 && <span className="ci-checks-tag ci-checks-tag-passed">{passedCount} passed</span>}
            {failedCount > 0 && <span className="ci-checks-tag ci-checks-tag-failed">{failedCount} failed</span>}
            {ciFailCount > 0 && <span className="ci-checks-tag ci-checks-tag-failed">{ciFailCount} failing in CI</span>}
          </span>
        </div>
        <div className="flex-row" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-primary btn-sm" onClick={handleRunAll}>
            Run All
          </button>
          {activeCount > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleStopAll}>
              Stop All ({activeCount})
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="ci-checks-list">
          {checks.map((check) => {
            const checkRuns = runsById.get(check.id) ?? [];
            const latestRun = checkRuns[0] ?? null;
            const lines = linesForRun(latestRun?.id);
            return (
              <CheckRow
                key={check.id}
                check={check}
                latestRun={latestRun}
                runLines={lines}
                ciFailedInPr={ciFailedIds.has(check.id)}
                scopedFiles={changedLintableFiles}
                scopedTsProjects={affectedTsProjects}
                onRun={onRun}
                onStop={onStop}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
