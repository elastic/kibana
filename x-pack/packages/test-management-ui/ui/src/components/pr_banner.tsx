/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { PRInfo } from '../types.js';

interface PRBannerProps {
  pr: PRInfo;
  ciFailureCount: number;
  ciFilterActive: boolean;
  failingCheckCount: number;
  onToggleCiFilter: () => void;
  onRefresh: () => void;
  onRunFailingChecks: () => void;
}

const CI_COLORS: Record<string, string> = {
  passing: '#017d73',
  failing: '#bd271e',
  pending: '#f5a700',
  unknown: '#98a2b3',
};

const CI_LABELS: Record<string, string> = {
  passing: 'Passing',
  failing: 'Failing',
  pending: 'In Progress',
  unknown: 'Unknown',
};

export const PRBanner = ({
  pr,
  ciFailureCount,
  ciFilterActive,
  failingCheckCount,
  onToggleCiFilter,
  onRefresh,
  onRunFailingChecks,
}: PRBannerProps) => {
  const hasFailures = pr.ciStatus === 'failing' && (pr.failedJobs.length > 0 || pr.failedStepNames.length > 0);
  const [showDetails, setShowDetails] = useState(hasFailures);

  return (
    <div className={`pr-strip pr-strip-${pr.ciStatus}`}>
      <div className="pr-strip-main">
        <span className="pr-strip-badge">PR</span>
        <a href={pr.url} target="_blank" rel="noopener noreferrer" className="pr-strip-number">
          #{pr.number}
        </a>
        <span className="pr-strip-title">{pr.title}</span>

        <div className="pr-strip-right">
          <span className="pr-strip-ci">
            <span
              className={`pr-ci-dot${pr.ciStatus === 'pending' ? ' pulse' : ''}`}
              style={{ background: CI_COLORS[pr.ciStatus] }}
            />
            <span style={{ color: CI_COLORS[pr.ciStatus], fontWeight: 600, fontSize: 12 }}>
              {CI_LABELS[pr.ciStatus]}
            </span>
          </span>
          <span className="pr-strip-branch">{pr.branch}</span>
          {pr.buildkiteUrl && (
            <a href={pr.buildkiteUrl} target="_blank" rel="noopener noreferrer" className="pr-strip-link">
              Buildkite
            </a>
          )}
          {hasFailures && (
            <button
              className={`btn btn-ghost btn-xs${showDetails ? ' btn-active' : ''}`}
              onClick={() => setShowDetails(!showDetails)}
            >
              {pr.failedJobs.length || pr.failedStepNames.length} failures {showDetails ? '▴' : '▾'}
            </button>
          )}
          <button className="pr-strip-refresh" onClick={onRefresh} title="Refresh PR status">↻</button>
        </div>
      </div>

      {showDetails && hasFailures && (
        <div className="pr-strip-details">
          <div className="pr-strip-details-actions">
            {failingCheckCount > 0 && (
              <button className="btn btn-danger btn-xs" onClick={onRunFailingChecks}>
                Run Failing Checks ({failingCheckCount})
              </button>
            )}
            {ciFailureCount > 0 && (
              <button
                className={`pill pill-failed${ciFilterActive ? ' pill-active' : ''}`}
                onClick={onToggleCiFilter}
              >
                Filter CI Failures <span className="pill-count">{ciFailureCount}</span>
              </button>
            )}
          </div>
          <div className="pr-strip-jobs">
            {pr.failedJobs.length > 0
              ? pr.failedJobs.slice(0, 8).map((job) => (
                  <a key={job.id} href={job.webUrl} target="_blank" rel="noopener noreferrer" className="pr-strip-job">
                    <span className="pr-strip-job-x">✕</span>
                    {job.name}
                  </a>
                ))
              : pr.failedSteps.map((step) => (
                  <a key={step.name} href={step.url} target="_blank" rel="noopener noreferrer" className="pr-strip-job">
                    <span className="pr-strip-job-x">✕</span>
                    {step.name}
                  </a>
                ))}
            {pr.failedJobs.length > 8 && (
              <span className="text-muted text-small">+{pr.failedJobs.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {pr.ciStatus === 'failing' && !hasFailures && (
        <div className="pr-strip-hint">
          Set <code>BUILDKITE_API_TOKEN</code> for detailed job failures
        </div>
      )}
    </div>
  );
};
