/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type EuiTimelineItemProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';

/** Map standard ANSI color codes to CSS colors */
const ANSI_COLORS: Record<number, string> = {
  30: '#333', // black
  31: '#e5534b', // red
  32: '#57ab5a', // green
  33: '#c69026', // yellow
  34: '#539bf5', // blue
  35: '#b083f0', // magenta
  36: '#39c5cf', // cyan
  37: '#adbac7', // white
  90: '#768390', // bright black (gray)
  91: '#ff7b72', // bright red
  92: '#7ee787', // bright green
  93: '#d2a04e', // bright yellow
  94: '#79c0ff', // bright blue
  95: '#d2a8ff', // bright magenta
  96: '#56d4dd', // bright cyan
  97: '#f0f3f6', // bright white
};

const ANSI_SEQ = /\x1b\[([0-9;]*)m/g;

/** Convert a single line containing ANSI escape sequences to React elements */
const ansiToElements = (line: string, lineIdx: number): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let color: string | undefined;
  let bold = false;
  let dim = false;
  let partIdx = 0;

  let match: RegExpExecArray | null;
  ANSI_SEQ.lastIndex = 0;
  while ((match = ANSI_SEQ.exec(line)) !== null) {
    // Push text before this escape
    if (match.index > lastIndex) {
      const text = line.slice(lastIndex, match.index);
      const style: React.CSSProperties = {};
      if (color) style.color = color;
      if (bold) style.fontWeight = 'bold';
      if (dim) style.opacity = 0.6;
      parts.push(
        Object.keys(style).length > 0 ? (
          <span key={`${lineIdx}-${partIdx++}`} style={style}>
            {text}
          </span>
        ) : (
          text
        )
      );
    }
    lastIndex = match.index + match[0].length;

    // Parse SGR codes
    const codes = match[1].split(';').map(Number);
    for (const code of codes) {
      if (code === 0) {
        color = undefined;
        bold = false;
        dim = false;
      } else if (code === 1) {
        bold = true;
      } else if (code === 2) {
        dim = true;
      } else if (ANSI_COLORS[code]) {
        color = ANSI_COLORS[code];
      }
    }
  }

  // Remaining text
  if (lastIndex < line.length) {
    const text = line.slice(lastIndex);
    const style: React.CSSProperties = {};
    if (color) style.color = color;
    if (bold) style.fontWeight = 'bold';
    if (dim) style.opacity = 0.6;
    parts.push(
      Object.keys(style).length > 0 ? (
        <span key={`${lineIdx}-${partIdx++}`} style={style}>
          {text}
        </span>
      ) : (
        text
      )
    );
  }

  return parts.length > 0 ? parts : line;
};

interface SuiteRun {
  run_id: string;
  suite_id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  exit_code?: number;
  error?: string;
  output?: string[];
}

export interface SuiteInfo {
  id: string;
  name: string;
  tags: string[];
  config_path?: string;
  slack_channel?: string;
}

interface SuiteDetailFlyoutProps {
  suite: SuiteInfo;
  onClose: () => void;
  onRun: (suiteId: string) => void;
}

const INTERNAL_VERSION = '1';

const useSuiteRuns = (suiteId: string) => {
  const { services } = useKibana<{ http: HttpStart }>();
  return useQuery({
    queryKey: ['evals', 'suites', suiteId, 'runs'],
    queryFn: () =>
      services.http!.get<{ runs: SuiteRun[] }>(`/internal/evals/suites/${suiteId}/runs`, {
        version: INTERNAL_VERSION,
      }),
    refetchInterval: (data) => {
      const hasRunning = data?.runs?.some((r) => r.status === 'running');
      return hasRunning ? 5000 : false;
    },
  });
};

const formatDuration = (startedAt: string, completedAt?: string): string => {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = end - start;

  if (diffMs < 1000) return '<1s';
  if (diffMs < 60_000) return `${Math.round(diffMs / 1000)}s`;
  const mins = Math.floor(diffMs / 60_000);
  const secs = Math.round((diffMs % 60_000) / 1000);
  return `${mins}m ${secs}s`;
};

const formatRelativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return 'just now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return new Date(iso).toLocaleString();
};

const statusColorMap: Record<string, string> = {
  running: 'primary',
  completed: 'success',
  failed: 'danger',
};

const statusIconMap: Record<string, string> = {
  running: 'clock',
  completed: 'check',
  failed: 'cross',
};

const AnsiOutput: React.FC<{ lines: string[]; maxHeight?: string }> = ({
  lines,
  maxHeight = '300px',
}) => {
  const { euiTheme } = useEuiTheme();
  const elements = useMemo(
    () =>
      lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {ansiToElements(line, idx)}
          {'\n'}
        </React.Fragment>
      )),
    [lines]
  );

  return (
    <pre
      css={css`
        font-family: ${euiTheme.font.familyCode};
        font-size: ${euiTheme.size.m};
        line-height: 1.5;
        padding: ${euiTheme.size.s};
        margin: 0;
        background: ${euiTheme.colors.backgroundBaseSubdued};
        border-radius: ${euiTheme.border.radius.small};
        overflow: auto;
        max-height: ${maxHeight};
        white-space: pre-wrap;
        word-break: break-all;
      `}
    >
      {elements}
    </pre>
  );
};

export const SuiteDetailFlyout: React.FC<SuiteDetailFlyoutProps> = ({ suite, onClose, onRun }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading } = useSuiteRuns(suite.id);
  const runs = data?.runs ?? [];
  const currentRun = runs.find((r) => r.status === 'running');
  const latestRun = runs[0];

  const outputMaxHeight = isExpanded ? '60vh' : '300px';

  const timelineItems: EuiTimelineItemProps[] = runs.map((run) => ({
    icon: (
      <EuiIcon
        type={statusIconMap[run.status] ?? 'dot'}
        color={statusColorMap[run.status] ?? 'subdued'}
      />
    ),
    children: (
      <EuiText size="xs">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={statusColorMap[run.status] ?? 'default'}>{run.status}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <code>{run.run_id.slice(0, 8)}</code>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{formatDuration(run.started_at, run.completed_at)}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {formatRelativeTime(run.started_at)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {run.error && (
          <EuiText size="xs" color="danger">
            {run.error}
          </EuiText>
        )}
        {run.output && run.output.length > 0 && (
          <EuiAccordion
            id={`runOutput-${run.run_id}`}
            buttonContent={i18n.translate('xpack.evals.suites.flyout.runOutputLabel', {
              defaultMessage: 'Output ({lineCount} lines)',
              values: { lineCount: run.output.length },
            })}
            paddingSize="none"
          >
            <EuiSpacer size="xs" />
            <AnsiOutput lines={run.output} maxHeight={outputMaxHeight} />
          </EuiAccordion>
        )}
      </EuiText>
    ),
  }));

  return (
    <EuiFlyout
      onClose={onClose}
      size={isExpanded ? 'l' : 'm'}
      maxWidth={isExpanded ? false : undefined}
      data-test-subj="suiteDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>{suite.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                isExpanded
                  ? i18n.translate('xpack.evals.suites.flyout.collapse', {
                      defaultMessage: 'Collapse',
                    })
                  : i18n.translate('xpack.evals.suites.flyout.expand', {
                      defaultMessage: 'Expand',
                    })
              }
            >
              <EuiButtonIcon
                iconType={isExpanded ? 'minimize' : 'fullScreen'}
                aria-label={isExpanded ? 'Collapse flyout' : 'Expand flyout'}
                onClick={() => setIsExpanded((prev) => !prev)}
                data-test-subj="suiteDetailFlyoutExpandBtn"
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {currentRun ? (
              <EuiBadge color="primary">
                {i18n.translate('xpack.evals.suites.flyout.running', {
                  defaultMessage: 'running',
                })}
              </EuiBadge>
            ) : (
              <EuiBadge color="default">
                {i18n.translate('xpack.evals.suites.flyout.idle', { defaultMessage: 'idle' })}
              </EuiBadge>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {suite.tags.map((tag) => (
            <EuiFlexItem key={tag} grow={false}>
              <EuiBadge color="hollow">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Suite info */}
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.evals.suites.flyout.suiteId', { defaultMessage: 'Suite ID' })}
            </strong>
            : <code>{suite.id}</code>
          </EuiText>
          {suite.config_path && (
            <EuiText size="xs">
              <strong>
                {i18n.translate('xpack.evals.suites.flyout.configPath', {
                  defaultMessage: 'Config',
                })}
              </strong>
              : <code>{suite.config_path}</code>
            </EuiText>
          )}
          {suite.slack_channel && (
            <EuiText size="xs">
              <strong>
                {i18n.translate('xpack.evals.suites.flyout.slackChannel', {
                  defaultMessage: 'Slack',
                })}
              </strong>
              : {suite.slack_channel}
            </EuiText>
          )}
        </EuiPanel>

        <EuiSpacer size="l" />

        {/* Current / latest run */}
        {latestRun && (
          <>
            <EuiTitle size="xs">
              <h3>
                {currentRun
                  ? i18n.translate('xpack.evals.suites.flyout.currentRun', {
                      defaultMessage: 'Current run',
                    })
                  : i18n.translate('xpack.evals.suites.flyout.latestRun', {
                      defaultMessage: 'Latest run',
                    })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel hasShadow={false} hasBorder>
              <EuiFlexGroup gutterSize="m" direction="column">
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={statusColorMap[latestRun.status] ?? 'default'}>
                        {latestRun.status}
                      </EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiCopy textToCopy={latestRun.run_id}>
                        {(copy) => (
                          <EuiText
                            size="xs"
                            onClick={copy}
                            css={{ cursor: 'pointer' }}
                            title="Click to copy run ID"
                          >
                            <code>{latestRun.run_id}</code>
                          </EuiText>
                        )}
                      </EuiCopy>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs">
                    <strong>
                      {i18n.translate('xpack.evals.suites.flyout.started', {
                        defaultMessage: 'Started',
                      })}
                    </strong>
                    : {formatRelativeTime(latestRun.started_at)} (
                    {new Date(latestRun.started_at).toLocaleTimeString()})
                  </EuiText>
                </EuiFlexItem>
                {latestRun.completed_at && (
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('xpack.evals.suites.flyout.duration', {
                          defaultMessage: 'Duration',
                        })}
                      </strong>
                      : {formatDuration(latestRun.started_at, latestRun.completed_at)}
                    </EuiText>
                  </EuiFlexItem>
                )}
                {!latestRun.completed_at && latestRun.status === 'running' && (
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('xpack.evals.suites.flyout.elapsed', {
                          defaultMessage: 'Elapsed',
                        })}
                      </strong>
                      : {formatDuration(latestRun.started_at)}
                    </EuiText>
                  </EuiFlexItem>
                )}
                {latestRun.exit_code !== undefined && (
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <strong>
                        {i18n.translate('xpack.evals.suites.flyout.exitCode', {
                          defaultMessage: 'Exit code',
                        })}
                      </strong>
                      : {latestRun.exit_code}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPanel>
            {latestRun.error && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  title={i18n.translate('xpack.evals.suites.flyout.errorTitle', {
                    defaultMessage: 'Run failed',
                  })}
                  color="danger"
                  iconType="alert"
                  size="s"
                >
                  <p>{latestRun.error}</p>
                </EuiCallOut>
              </>
            )}
            {latestRun.output && latestRun.output.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiAccordion
                  id="suiteRunOutput"
                  buttonContent={i18n.translate('xpack.evals.suites.flyout.outputLabel', {
                    defaultMessage: 'Process output ({lineCount} lines)',
                    values: { lineCount: latestRun.output.length },
                  })}
                  data-test-subj="suiteRunOutputAccordion"
                >
                  <EuiSpacer size="xs" />
                  <AnsiOutput lines={latestRun.output} maxHeight={outputMaxHeight} />
                </EuiAccordion>
              </>
            )}
          </>
        )}

        <EuiSpacer size="l" />

        {/* Run history */}
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.evals.suites.flyout.runHistory', {
              defaultMessage: 'Run history',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {isLoading ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : timelineItems.length > 0 ? (
          <EuiTimeline items={timelineItems} />
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.evals.suites.flyout.noRuns', {
              defaultMessage: 'No runs recorded yet. Start an evaluation to see results here.',
            })}
          </EuiText>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onClose}>
              {i18n.translate('xpack.evals.suites.flyout.close', { defaultMessage: 'Close' })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="play" onClick={() => onRun(suite.id)} disabled={!!currentRun}>
              {i18n.translate('xpack.evals.suites.flyout.runSuite', {
                defaultMessage: 'Run evaluation',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
