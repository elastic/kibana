/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo } from 'react';
import type { TestConfig, TestRunResult, StreamEvent, LogLine, ServerStatus } from '../types.js';
import { StatusBadge } from './status_badge.js';
import { TypeBadge } from './type_badge.js';
import { LogViewer } from './log_viewer.js';
import { RunSummary } from './run_summary.js';
import { stripAnsi } from '../utils/strip_ansi.js';

const NEEDS_SERVERS: Set<string> = new Set(['scout', 'ftr']);

interface ConfigCardProps {
  config: TestConfig;
  runs: TestRunResult[];
  events: StreamEvent[];
  expanded: boolean;
  onToggle: () => void;
  onRun: (configId: string) => void;
  onStop: (runId: string) => void;
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
    <div className="flex-row">
      <span style={{ fontWeight: 600, minWidth: 90 }}>{label}</span>
      <StatusBadge status={status?.status ?? 'stopped'} />
      {status?.uptime ? (
        <span className="text-muted text-small">{Math.round(status.uptime / 1000)}s</span>
      ) : null}
      {isStopped ? (
        <button className="btn btn-success btn-sm" onClick={onStart}>
          Start
        </button>
      ) : (
        <button className="btn btn-danger btn-sm" onClick={onStop}>
          Stop
        </button>
      )}
    </div>
  );
};

export const ConfigCard = ({
  config,
  runs,
  events,
  expanded,
  onToggle,
  onRun,
  onStop,
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
  const isActive =
    latestRun?.status === 'running' || latestRun?.status === 'starting';
  const needsServers = NEEDS_SERVERS.has(config.type);

  const runLines: LogLine[] = latestRun
    ? [
        ...latestRun.output.map((d): LogLine => ({ data: d, type: 'output' })),
        ...latestRun.errorOutput.map((d): LogLine => ({ data: d, type: 'error' })),
        ...events
          .filter(
            (e) =>
              e.runId === latestRun.id && (e.type === 'output' || e.type === 'error')
          )
          .map((e): LogLine => ({ data: e.data ?? '', type: e.type as 'output' | 'error' })),
      ]
    : [];

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
        if (fileMatch) {
          seenFiles.add(fileMatch[2]);
        }
        if (/^\s*[✓√]\s+/.test(sub)) {
          testsPassed++;
        }
        if (/^\s*[✕✗×]\s+/.test(sub)) {
          testsFailed++;
        }
      }
    }

    const filesCompleted = seenFiles.size;
    const totalFiles = Math.max(config.testCount ?? 0, filesCompleted);
    const pct = totalFiles > 0 ? Math.min(100, Math.round((filesCompleted / totalFiles) * 100)) : 0;

    return {
      filesCompleted,
      totalFiles,
      testsPassed,
      testsFailed,
      testsTotal: testsPassed + testsFailed,
      pct,
    };
  }, [isActive, latestRun, runLines, config.type, config.testCount]);

  const esStatus = servers.find((s) => s.name === 'elasticsearch');
  const kbnStatus = servers.find((s) => s.name === 'kibana');

  return (
    <div
      className="card"
      style={{
        borderColor: expanded ? '#006bb4' : undefined,
        borderLeftWidth: expanded ? 3 : 1,
      }}
    >
      {/* Header - always visible */}
      <div className="flex-between" style={{ cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-row mb-8">
            <TypeBadge type={config.type} />
            <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {config.name}
            </strong>
            {latestRun && <StatusBadge status={latestRun.status} />}
            {config.testCount !== undefined && (
              <span className={`test-count-badge ${config.testCount === 0 ? 'test-count-empty' : ''}`}>
                {config.testCount === 0 ? 'No test files' : `${config.testCount} file${config.testCount === 1 ? '' : 's'}`}
              </span>
            )}
          </div>
          <div className="mono text-muted text-small">{config.relativePath}</div>
          {config.owner && config.owner.length > 0 && (
            <div className="text-muted text-small mt-8">{config.owner.join(', ')}</div>
          )}
        </div>
        <div className="flex-row" onClick={(e) => e.stopPropagation()}>
          {isActive && latestRun ? (
            <button className="btn btn-danger btn-sm" onClick={() => onStop(latestRun.id)}>
              Stop
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => onRun(config.id)}>
              Run
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            style={{ minWidth: 28, justifyContent: 'center' }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Progress bar for running Jest tests */}
      {progress && progress.totalFiles > 0 && (
        <div className="progress-section">
          <div className="progress-bar-track">
            <div
              className={`progress-bar-fill ${progress.testsFailed > 0 ? 'progress-bar-has-failures' : ''}`}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <div className="progress-info">
            <span>
              {progress.filesCompleted}/{progress.totalFiles} suites
            </span>
            <span className="progress-tests">
              {progress.testsPassed > 0 && (
                <span className="progress-passed">{progress.testsPassed} passed</span>
              )}
              {progress.testsFailed > 0 && (
                <span className="progress-failed">{progress.testsFailed} failed</span>
              )}
              {progress.testsTotal > 0 && (
                <span className="progress-total">({progress.testsTotal} tests)</span>
              )}
            </span>
            <span>{progress.pct}%</span>
          </div>
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="config-expanded">
          {/* Server controls for FTR/Scout */}
          {needsServers && (
            <div className="server-controls">
              <div className="flex-between mb-8">
                <span style={{ fontWeight: 600, fontSize: 13, color: '#69707d' }}>Servers</span>
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <ServerControl
                  label="Elasticsearch"
                  status={esStatus}
                  onStart={onStartES}
                  onStop={onStopES}
                />
                <ServerControl
                  label="Kibana"
                  status={kbnStatus}
                  onStart={onStartKbn}
                  onStop={onStopKbn}
                />
              </div>
            </div>
          )}

          {/* Run history summary */}
          {runs.length > 1 && (
            <div className="text-muted text-small mb-8">
              {runs.length} runs — latest: {latestRun?.status}
              {latestRun?.exitCode !== undefined && ` (exit ${latestRun.exitCode})`}
              {' · '}
              {latestRun && new Date(latestRun.startedAt).toLocaleTimeString()}
            </div>
          )}

          {/* Tabs */}
          {needsServers ? (
            <>
              <div className="tab-bar">
                <button
                  className={logTab === 'summary' ? 'active' : ''}
                  onClick={() => setLogTab('summary')}
                >
                  Summary
                </button>
                <button
                  className={logTab === 'run' ? 'active' : ''}
                  onClick={() => setLogTab('run')}
                >
                  Run Output {latestRun ? `(${latestRun.status})` : ''}
                </button>
                <button
                  className={logTab === 'elasticsearch' ? 'active' : ''}
                  onClick={() => setLogTab('elasticsearch')}
                >
                  ES Logs
                </button>
                <button
                  className={logTab === 'kibana' ? 'active' : ''}
                  onClick={() => setLogTab('kibana')}
                >
                  Kibana Logs
                </button>
              </div>
              {logTab === 'summary' ? (
                <RunSummary run={latestRun} lines={runLines} configType={config.type} />
              ) : (
                <LogViewer
                  lines={
                    logTab === 'run'
                      ? runLines
                      : logTab === 'elasticsearch'
                        ? esOutput
                        : kbnOutput
                  }
                />
              )}
            </>
          ) : (
            <>
              <div className="tab-bar">
                <button
                  className={logTab === 'summary' ? 'active' : ''}
                  onClick={() => setLogTab('summary')}
                >
                  Summary
                </button>
                <button
                  className={logTab === 'run' ? 'active' : ''}
                  onClick={() => setLogTab('run')}
                >
                  Output {latestRun ? `(${latestRun.status})` : ''}
                </button>
              </div>
              {logTab === 'summary' ? (
                <RunSummary run={latestRun} lines={runLines} configType={config.type} />
              ) : (
                <LogViewer lines={runLines} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
