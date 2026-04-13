/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type { LogLine, TestType, TestRunResult } from '../types.js';
import { stripAnsi } from '../utils/strip_ansi.js';

interface RunSummaryProps {
  run: TestRunResult | null;
  lines: LogLine[];
  configType: TestType;
  changedFiles?: string[];
}

interface CountBreakdown {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

interface SlowTest {
  name: string;
  file: string;
  duration: string;
}

interface TestFileResult {
  file: string;
  duration: string;
  passed: boolean;
  testCases: TestCase[];
}

interface TestCase {
  name: string;
  passed: boolean;
  duration: string;
}

interface JestSummary {
  suites: CountBreakdown | null;
  tests: CountBreakdown | null;
  snapshots: CountBreakdown | null;
  time: string | null;
  slowTests: SlowTest[];
  fileResults: TestFileResult[];
}

const parseCount = (text: string): CountBreakdown => {
  const failed = text.match(/(\d+)\s+failed/)?.[1] ?? '0';
  const passed = text.match(/(\d+)\s+passed/)?.[1] ?? '0';
  const skipped = text.match(/(\d+)\s+(?:skipped|pending|todo)/)?.[1] ?? '0';
  const total = text.match(/(\d+)\s+total/)?.[1] ?? '0';
  return {
    failed: parseInt(failed, 10),
    passed: parseInt(passed, 10),
    skipped: parseInt(skipped, 10),
    total: parseInt(total, 10),
  };
};

/**
 * Normalise raw log data into individual lines. Output buffers often
 * concatenate several logical lines into a single string, so we split
 * on newlines first.
 */
const toLines = (rawLines: LogLine[]): string[] => {
  const out: string[] = [];
  for (const l of rawLines) {
    const clean = stripAnsi(l.data ?? '');
    for (const sub of clean.split('\n')) {
      out.push(sub);
    }
  }
  return out;
};

const FILE_RE = /^(PASS|FAIL)\s+(.+?)(?:\s+\(([^)]+)\))?\s*$/;
const TEST_CASE_RE = /^(\s*)(✓|✕|✗|×|√)\s+(.+?)(?:\s+\(([^)]+)\))?\s*$/;

const parseJestOutput = (lines: string[]): JestSummary => {
  const summary: JestSummary = {
    suites: null,
    tests: null,
    snapshots: null,
    time: null,
    slowTests: [],
    fileResults: [],
  };

  let currentFile: TestFileResult | null = null;
  let currentSlowFile = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('Test Suites:')) {
      summary.suites = parseCount(trimmed);
      continue;
    }
    if (trimmed.startsWith('Tests:') && trimmed.includes('total')) {
      summary.tests = parseCount(trimmed);
      continue;
    }
    if (trimmed.startsWith('Snapshots:')) {
      summary.snapshots = parseCount(trimmed);
      continue;
    }
    if (trimmed.startsWith('Time:')) {
      summary.time = trimmed.replace('Time:', '').trim();
      continue;
    }

    const fileMatch = trimmed.match(FILE_RE);
    if (fileMatch) {
      currentFile = {
        passed: fileMatch[1] === 'PASS',
        file: fileMatch[2],
        duration: fileMatch[3] ?? '',
        testCases: [],
      };
      summary.fileResults.push(currentFile);
      continue;
    }

    const caseMatch = line.match(TEST_CASE_RE);
    if (caseMatch && currentFile) {
      const symbol = caseMatch[2];
      currentFile.testCases.push({
        passed: symbol === '✓' || symbol === '√',
        name: caseMatch[3],
        duration: caseMatch[4] ?? '',
      });
      continue;
    }

    // Slow test file header
    const slowFileMatch = trimmed.match(/^([\w\-/.]+\.(?:test|spec)\.\w+)$/);
    if (slowFileMatch) {
      currentSlowFile = slowFileMatch[1];
    }

    // Slow test entry: "• Test Name (duration)"
    const slowMatch = trimmed.match(/^[•·]\s+(.+?)\s*\((\d[\d,.]*\s*(?:ms|s))\)\s*$/);
    if (slowMatch) {
      summary.slowTests.push({
        name: slowMatch[1],
        file: currentSlowFile,
        duration: slowMatch[2],
      });
    }
  }

  return summary;
};

const CountRow = ({ label, counts }: { label: string; counts: CountBreakdown }) => (
  <div className="summary-count-row">
    <span className="summary-count-label">{label}</span>
    <span className="summary-count-values">
      {counts.failed > 0 && <span className="summary-count-failed">{counts.failed} failed</span>}
      {counts.skipped > 0 && (
        <span className="summary-count-skipped">{counts.skipped} skipped</span>
      )}
      {counts.passed > 0 && <span className="summary-count-passed">{counts.passed} passed</span>}
      <span className="summary-count-total">{counts.total} total</span>
    </span>
  </div>
);

const FileResultRow = ({ result, isChangedFile }: { result: TestFileResult; isChangedFile: boolean }) => {
  const [open, setOpen] = useState(false);
  const hasCases = result.testCases.length > 0;
  const failedCases = result.testCases.filter((tc) => !tc.passed);

  return (
    <div className={`summary-file-entry ${result.passed ? '' : 'summary-file-entry-fail'}`}>
      <div
        className={`summary-file-row ${hasCases ? 'summary-file-expandable' : ''}`}
        onClick={hasCases ? () => setOpen(!open) : undefined}
      >
        <span
          className={`summary-file-icon ${
            result.passed ? 'summary-file-pass' : 'summary-file-fail'
          }`}
        >
          {result.passed ? '✓' : '✕'}
        </span>
        <span className="summary-file-path mono">{result.file}</span>
<<<<<<< HEAD
        {!result.passed && isChangedFile && (
          <span className="diff-badge diff-badge-new">NEW</span>
        )}
        {!result.passed && !isChangedFile && (
          <span className="diff-badge diff-badge-preexisting">Pre-existing</span>
        )}
        {result.duration && (
          <span className="summary-file-duration">{result.duration}</span>
        )}
=======
        {result.duration && <span className="summary-file-duration">{result.duration}</span>}
>>>>>>> b2ad74eea23ae167b1d41ccbe4642cc0d70092b1
        {hasCases && (
          <span className="summary-file-toggle">
            {open ? '▾' : '▸'} {result.testCases.length}
          </span>
        )}
      </div>
      {open && hasCases && (
        <div className="summary-test-cases">
          {failedCases.length > 0 &&
            failedCases.map((tc, j) => (
              <div key={`f${j}`} className="summary-test-case summary-test-case-fail">
                <span className="summary-tc-icon">✕</span>
                <span className="summary-tc-name">{tc.name}</span>
                {tc.duration && <span className="summary-tc-duration">{tc.duration}</span>}
              </div>
            ))}
          {result.testCases
            .filter((tc) => tc.passed)
            .map((tc, j) => (
              <div key={`p${j}`} className="summary-test-case">
                <span className="summary-tc-icon summary-tc-pass">✓</span>
                <span className="summary-tc-name">{tc.name}</span>
                {tc.duration && <span className="summary-tc-duration">{tc.duration}</span>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

const JestSummaryView = ({ summary, run, changedFiles }: { summary: JestSummary; run: TestRunResult | null; changedFiles?: string[] }) => {
  const changedSet = useMemo(() => new Set(changedFiles ?? []), [changedFiles]);
  const hasCounts = summary.suites || summary.tests;
  const overallPassed =
    run?.status === 'passed' || (summary.suites?.failed === 0 && summary.tests?.failed === 0);
  const overallFailed =
    run?.status === 'failed' ||
    (summary.suites?.failed ?? 0) > 0 ||
    (summary.tests?.failed ?? 0) > 0;

  const failedFiles = summary.fileResults.filter((f) => !f.passed);
  const passedFiles = summary.fileResults.filter((f) => f.passed);

  return (
    <div className="run-summary">
      {hasCounts && (
        <div
          className={`summary-banner ${
            overallFailed
              ? 'summary-banner-fail'
              : overallPassed
              ? 'summary-banner-pass'
              : 'summary-banner-neutral'
          }`}
        >
          <span className="summary-banner-icon">
            {overallFailed ? '✕' : overallPassed ? '✓' : '●'}
          </span>
          <span>
            {overallFailed ? 'Tests Failed' : overallPassed ? 'Tests Passed' : 'Tests Completed'}
          </span>
          {run?.exitCode !== undefined && (
            <span className="summary-exit-code">Exit code: {run.exitCode}</span>
          )}
        </div>
      )}

      {hasCounts && (
        <div className="summary-counts">
          {summary.suites && <CountRow label="Test Suites" counts={summary.suites} />}
          {summary.tests && <CountRow label="Tests" counts={summary.tests} />}
          {summary.snapshots && summary.snapshots.total > 0 && (
            <CountRow label="Snapshots" counts={summary.snapshots} />
          )}
        </div>
      )}

      {summary.time && (
        <div className="summary-meta">
          <span className="summary-meta-label">Duration</span>
          <span>{summary.time}</span>
        </div>
      )}

      {summary.fileResults.length > 0 && (
        <div className="summary-section">
          <div className="summary-section-title">
            Test Files ({failedFiles.length} failed, {passedFiles.length} passed)
          </div>
          <div className="summary-file-list">
            {[...failedFiles, ...passedFiles].map((fr, i) => {
              const isChanged = changedSet.size > 0 && [...changedSet].some((cf) => fr.file.includes(cf) || cf.includes(fr.file));
              return <FileResultRow key={i} result={fr} isChangedFile={isChanged} />;
            })}
          </div>
        </div>
      )}

      {summary.slowTests.length > 0 && (
        <div className="summary-section">
          <div className="summary-section-title">Slow Tests</div>
          <div className="summary-slow-list">
            {summary.slowTests.map((st, i) => (
              <div key={i} className="summary-slow-row">
                <span className="summary-slow-duration">{st.duration}</span>
                <span className="summary-slow-name">{st.name}</span>
                {st.file && <span className="mono text-muted text-small">{st.file}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasCounts && !summary.time && summary.fileResults.length === 0 && (
        <div className="summary-empty">
          {run?.status === 'running' || run?.status === 'starting'
            ? 'Test run in progress — summary will appear when finished.'
            : 'No summary data available yet.'}
        </div>
      )}
    </div>
  );
};

const GenericSummaryView = ({ run, lines }: { run: TestRunResult | null; lines: string[] }) => {
  const passCount = lines.filter((l) => /\bpass(ed)?\b/i.test(l)).length;
  const failCount = lines.filter((l) => /\bfail(ed|ure)?\b/i.test(l)).length;

  return (
    <div className="run-summary">
      {run && (
        <div
          className={`summary-banner ${
            run.status === 'failed'
              ? 'summary-banner-fail'
              : run.status === 'passed'
              ? 'summary-banner-pass'
              : 'summary-banner-neutral'
          }`}
        >
          <span className="summary-banner-icon">
            {run.status === 'failed' ? '✕' : run.status === 'passed' ? '✓' : '●'}
          </span>
          <span style={{ textTransform: 'capitalize' }}>{run.status}</span>
          {run.exitCode !== undefined && (
            <span className="summary-exit-code">Exit code: {run.exitCode}</span>
          )}
        </div>
      )}

      {run && (
        <div className="summary-counts">
          <div className="summary-count-row">
            <span className="summary-count-label">Started</span>
            <span>{new Date(run.startedAt).toLocaleString()}</span>
          </div>
          {run.finishedAt && (
            <div className="summary-count-row">
              <span className="summary-count-label">Finished</span>
              <span>{new Date(run.finishedAt).toLocaleString()}</span>
            </div>
          )}
          {run.finishedAt && (
            <div className="summary-count-row">
              <span className="summary-count-label">Duration</span>
              <span>
                {(
                  (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) /
                  1000
                ).toFixed(1)}
                s
              </span>
            </div>
          )}
          {(passCount > 0 || failCount > 0) && (
            <div className="summary-count-row">
              <span className="summary-count-label">Output lines</span>
              <span className="summary-count-values">
                {failCount > 0 && (
                  <span className="summary-count-failed">{failCount} failures</span>
                )}
                {passCount > 0 && <span className="summary-count-passed">{passCount} passes</span>}
                <span className="summary-count-total">{lines.length} total lines</span>
              </span>
            </div>
          )}
        </div>
      )}

      {(!run || (run.status !== 'running' && run.status !== 'starting' && !run.finishedAt)) && (
        <div className="summary-empty">
          {run?.status === 'running' || run?.status === 'starting'
            ? 'Test run in progress — summary will appear when finished.'
            : 'No summary data available yet.'}
        </div>
      )}
    </div>
  );
};

export const RunSummary = ({ run, lines, configType, changedFiles }: RunSummaryProps) => {
  const cleanLines = useMemo(() => toLines(lines), [lines]);

  const isJest = configType === 'jest' || configType === 'jest-integration';

  if (isJest) {
    const summary = parseJestOutput(cleanLines);
    return <JestSummaryView summary={summary} run={run} changedFiles={changedFiles} />;
  }

  return <GenericSummaryView run={run} lines={cleanLines} />;
};
