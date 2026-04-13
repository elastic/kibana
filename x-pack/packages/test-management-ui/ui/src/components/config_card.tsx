/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo } from 'react';
import type { TestConfig, TestRunResult, StreamEvent, LogLine, ServerStatus } from '../types.js';
import { StatusBadge } from './status_badge.js';
import { LogViewer } from './log_viewer.js';
import { RunSummary } from './run_summary.js';
import { stripAnsi } from '../utils/strip_ansi.js';

const NEEDS_SERVERS: Set<string> = new Set(['scout', 'ftr']);

const TYPE_COLORS: Record<string, string> = {
  jest: '#c93c37',
  'jest-integration': '#e07c58',
  scout: '#006bb4',
  ftr: '#490091',
};

const TYPE_SHORT: Record<string, string> = {
  jest: 'JEST',
  'jest-integration': 'JINT',
  scout: 'SCOUT',
  ftr: 'FTR',
};

interface ConfigCardProps {
  config: TestConfig;
  runs: TestRunResult[];
  events: StreamEvent[];
  expanded: boolean;
  ciStatus?: 'passed' | 'failed';
  isAffected?: boolean;
  changedFiles?: string[];
  onToggle: () => void;
  onRun: (configId: string, extraArgs?: string[]) => void;
  onStop: (runId: string) => void;
  onRepeat?: (configId: string, configName: string) => void;
  servers: ServerStatus[];
  esOutput: LogLine[];
  kbnOutput: LogLine[];
  onStartES: () => void;
  onStartKbn: () => void;
  onStopES: () => void;
  onStopKbn: () => void;
}

const ServerControl = ({
  label,
  status,
  onStart,
  onStop,
}: {
  label: string;
  status: ServerStatus | undefined;
  onStart: () => void;
  onStop: () => void;
}) => {
  const isStopped = !status || status.status === 'stopped' || status.status === 'error';
  return (
    <div className="server-ctrl">
      <span className="server-ctrl-label">{label}</span>
      <StatusBadge status={status?.status ?? 'stopped'} />
      {status?.uptime ? (
        <span className="text-muted text-small">{Math.round(status.uptime / 1000)}s</span>
      ) : null}
      {isStopped ? (
        <button className="btn btn-success btn-xs" onClick={onStart}>Start</button>
      ) : (
        <button className="btn btn-danger btn-xs" onClick={onStop}>Stop</button>
      )}
    </div>
  );
};

export const ConfigCard = ({
  config,
  runs,
  events,
  expanded,
  ciStatus,
  isAffected,
  changedFiles,
  onToggle,
  onRun,
  onStop,
  onRepeat,
  servers,
  esOutput,
  kbnOutput,
  onStartES,
  onStartKbn,
  onStopES,
  onStopKbn,
}: ConfigCardProps) => {
  const [logTab, setLogTab] = useState<'summary' | 'run' | 'elasticsearch' | 'kibana'>('summary');

  const latestRun = runs.length > 0 ? runs[0] : null;
  const isActive = latestRun?.status === 'running' || latestRun?.status === 'starting';
  const needsServers = NEEDS_SERVERS.has(config.type);

  const runLines: LogLine[] = useMemo(() => {
    if (!latestRun) return [];
    return events
      .filter((e) => e.runId === latestRun.id && (e.type === 'output' || e.type === 'error'))
      .map((e): LogLine => ({ data: e.data ?? '', type: e.type as 'output' | 'error' }));
  }, [latestRun, events]);

  const progress = useMemo(() => {
    if (!isActive || !latestRun) return null;
    const isJest = config.type === 'jest' || config.type === 'jest-integration';
    if (!isJest) return null;

    const FILE_RE = /^(PASS|FAIL)\s+(.+?)(?:\s+\(.+\))?\s*$/;
    const seenFiles = new Set<string>();
    let testsPassed = 0;
    let testsFailed = 0;

    for (const line of runLines) {
      const subLines = stripAnsi(line.data ?? '').split('\n');
      for (const sub of subLines) {
        const trimmed = sub.trim();
        const fileMatch = trimmed.match(FILE_RE);
        if (fileMatch) seenFiles.add(fileMatch[2]);
        if (/^\s*[✓√]\s+/.test(sub)) testsPassed++;
        if (/^\s*[✕✗×]\s+/.test(sub)) testsFailed++;
      }
    }

    const filesCompleted = seenFiles.size;
    const totalFiles = Math.max(config.testCount ?? 0, filesCompleted);
    const pct = totalFiles > 0 ? Math.min(100, Math.round((filesCompleted / totalFiles) * 100)) : 0;

    return { filesCompleted, totalFiles, testsPassed, testsFailed, testsTotal: testsPassed + testsFailed, pct };
  }, [isActive, latestRun, runLines, config.type, config.testCount]);

  const esStatus = servers.find((s) => s.name === 'elasticsearch');
  const kbnStatus = servers.find((s) => s.name === 'kibana');

  const typeColor = TYPE_COLORS[config.type] ?? '#69707d';
  const typeLabel = TYPE_SHORT[config.type] ?? config.type.toUpperCase();

  const statusClass = latestRun
    ? latestRun.status === 'failed' ? 'row-failed' :
      latestRun.status === 'passed' ? 'row-passed' :
      (latestRun.status === 'running' || latestRun.status === 'starting') ? 'row-running' : ''
    : '';

  return (
    <div className={`config-row${expanded ? ' config-row-expanded' : ''} ${statusClass}`}>
      {/* Compact row header */}
      <div className="config-row-header" onClick={onToggle}>
        <span className="config-type-dot" style={{ background: typeColor }} title={config.type}>
          {typeLabel}
        </span>

        <div className="config-row-info">
          <span className="config-row-name">{config.name}</span>
          <span className="config-row-path">{config.relativePath}</span>
        </div>

        {config.owner && config.owner.length > 0 && (
          <span className="config-row-owner">{config.owner[0]}</span>
        )}

        {config.testCount !== undefined && config.testCount > 0 && (
          <span className="config-row-files">{config.testCount} file{config.testCount === 1 ? '' : 's'}</span>
        )}

        {isAffected && <span className="badge-affected">Changed</span>}
        {ciStatus === 'failed' && <span className="badge-ci-fail">CI</span>}

        {latestRun && <StatusBadge status={latestRun.status} />}

        {/* Progress mini-bar for running tests */}
        {progress && progress.totalFiles > 0 && (
          <div className="config-row-progress">
            <div className="mini-progress-track">
              <div
                className={`mini-progress-fill${progress.testsFailed > 0 ? ' mini-progress-warn' : ''}`}
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <span className="mini-progress-text">{progress.pct}%</span>
          </div>
        )}

        <div className="config-row-actions" onClick={(e) => e.stopPropagation()}>
          {isActive && latestRun ? (
            <button className="btn btn-danger btn-xs" onClick={() => onStop(latestRun.id)}>Stop</button>
          ) : (
            <>
              <button className="btn btn-primary btn-xs" onClick={() => onRun(config.id)}>Run</button>
              {onRepeat && (config.type === 'jest' || config.type === 'jest-integration') && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => onRepeat(config.id, config.name)}
                  title="Run multiple times (flaky detection)"
                >
                  N×
                </button>
              )}
            </>
          )}
          <button
            className="btn btn-ghost btn-xs config-row-chevron"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Progress bar for running Jest tests (full-width) */}
      {progress && progress.totalFiles > 0 && expanded && (
        <div className="progress-section">
          <div className="progress-bar-track">
            <div
              className={`progress-bar-fill ${progress.testsFailed > 0 ? 'progress-bar-has-failures' : ''}`}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <div className="progress-info">
            <span>{progress.filesCompleted}/{progress.totalFiles} suites</span>
            <span className="progress-tests">
              {progress.testsPassed > 0 && <span className="progress-passed">{progress.testsPassed} passed</span>}
              {progress.testsFailed > 0 && <span className="progress-failed">{progress.testsFailed} failed</span>}
              {progress.testsTotal > 0 && <span className="progress-total">({progress.testsTotal} tests)</span>}
            </span>
            <span>{progress.pct}%</span>
          </div>
        </div>
      )}

      {/* Expanded detail panel */}
      {expanded && (
        <div className="config-detail">
          {needsServers && (
            <div className="server-controls">
              <ServerControl label="Elasticsearch" status={esStatus} onStart={onStartES} onStop={onStopES} />
              <ServerControl label="Kibana" status={kbnStatus} onStart={onStartKbn} onStop={onStopKbn} />
            </div>
          )}

          {latestRun?.repeatBatchId && (
            <div className="repeat-indicator">
              <span className="repeat-indicator-label">Flaky Detection</span>
              <span className="repeat-indicator-progress">
                Run {latestRun.iteration ?? '?'} of {latestRun.totalIterations ?? '?'}
              </span>
              {(() => {
                const batchRuns = runs.filter((r) => r.repeatBatchId === latestRun.repeatBatchId);
                const passed = batchRuns.filter((r) => r.status === 'passed').length;
                const failed = batchRuns.filter((r) => r.status === 'failed').length;
                return (
                  <span className="repeat-indicator-stats">
                    {passed > 0 && <span className="progress-passed">{passed}✓</span>}
                    {failed > 0 && <span className="progress-failed">{failed}✕</span>}
                  </span>
                );
              })()}
            </div>
          )}

          {runs.length > 1 && (
            <div className="text-muted text-small" style={{ marginBottom: 8 }}>
              {runs.length} runs — latest: {latestRun?.status}
              {latestRun?.exitCode !== undefined && ` (exit ${latestRun.exitCode})`}
              {' · '}
              {latestRun && new Date(latestRun.startedAt).toLocaleTimeString()}
            </div>
          )}

          <div className="tab-bar">
            <button className={logTab === 'summary' ? 'active' : ''} onClick={() => setLogTab('summary')}>
              Summary
            </button>
            <button className={logTab === 'run' ? 'active' : ''} onClick={() => setLogTab('run')}>
              Output {latestRun ? `(${latestRun.status})` : ''}
            </button>
            {needsServers && (
              <>
                <button className={logTab === 'elasticsearch' ? 'active' : ''} onClick={() => setLogTab('elasticsearch')}>
                  ES Logs
                </button>
                <button className={logTab === 'kibana' ? 'active' : ''} onClick={() => setLogTab('kibana')}>
                  Kibana Logs
                </button>
              </>
            )}
          </div>

          {logTab === 'summary' ? (
            <RunSummary run={latestRun} lines={runLines} configType={config.type} changedFiles={changedFiles} />
          ) : (
            <LogViewer
              lines={
                logTab === 'run' ? runLines
                  : logTab === 'elasticsearch' ? esOutput
                  : kbnOutput
              }
            />
          )}
        </div>
      )}
    </div>
  );
};
