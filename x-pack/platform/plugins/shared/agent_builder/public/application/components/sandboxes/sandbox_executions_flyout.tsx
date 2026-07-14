/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { defer } from 'rxjs';
import {
  EuiBadge,
  EuiButton,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { internalApiPath } from '../../../../common/constants';
import { useKibana } from '../../hooks/use_kibana';
import { OpencodeTimeline, type OpencodeTimelineItem } from './opencode_timeline';

type RunStatus = 'running' | 'completed' | 'error';

interface RunSummary {
  runId: string;
  conversationId: string;
  status: RunStatus;
  podName: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

interface RunDetail extends RunSummary {
  answer?: string;
  error?: string;
  provider?: string;
  kubeContext: string;
  namespace: string;
  timeline: OpencodeTimelineItem[];
}

interface LiveRunEvent extends ServerSentEvent {
  status?: RunStatus;
  timeline?: OpencodeTimelineItem[];
}

const labels = {
  title: i18n.translate('xpack.agentBuilder.sandboxExecutions.title', {
    defaultMessage: 'Sandbox executions',
  }),
  subtitle: i18n.translate('xpack.agentBuilder.sandboxExecutions.subtitle', {
    defaultMessage: 'OpenCode coding sub-agent runs for this conversation',
  }),
  none: i18n.translate('xpack.agentBuilder.sandboxExecutions.none', {
    defaultMessage: 'No sandbox executions',
  }),
  noneBody: i18n.translate('xpack.agentBuilder.sandboxExecutions.noneBody', {
    defaultMessage:
      'When the agent delegates a coding task to the OpenCode sub-agent, its runs appear here.',
  }),
  cluster: i18n.translate('xpack.agentBuilder.sandboxExecutions.cluster', {
    defaultMessage: 'Sandbox environment',
  }),
  local: i18n.translate('xpack.agentBuilder.sandboxExecutions.local', {
    defaultMessage: 'Local cluster',
  }),
  cloud: i18n.translate('xpack.agentBuilder.sandboxExecutions.cloud', {
    defaultMessage: 'Cloud Run',
  }),
  exec: i18n.translate('xpack.agentBuilder.sandboxExecutions.exec', {
    defaultMessage: 'Run a command in the sandbox',
  }),
  execRun: i18n.translate('xpack.agentBuilder.sandboxExecutions.execRun', {
    defaultMessage: 'Run',
  }),
};

const statusColor = (status: RunStatus): 'success' | 'danger' | 'warning' =>
  status === 'completed' ? 'success' : status === 'error' ? 'danger' : 'warning';

const relativeTime = (iso: string): string => {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

/**
 * The run's `kubeContext` for cloud-run holds "<project> / <region>" (see the
 * executor). Parse it so we can deep-link into the GCP Cloud Run console.
 */
const parseCloudRunEnv = (kubeContext: string): { project: string; region?: string } | undefined => {
  const [project, region] = kubeContext.split('/').map((s) => s.trim());
  if (!project) return undefined;
  return { project, region: region || undefined };
};

/** GCP console deep link to the Cloud Run services list for a project/region. */
const cloudRunConsoleUrl = (project: string, region?: string): string => {
  const base = `https://console.cloud.google.com/run?project=${encodeURIComponent(project)}`;
  return region ? `${base}&region=${encodeURIComponent(region)}` : base;
};

/**
 * Cluster/environment panel derived from the *selected run's own record* (which
 * provider it actually used), rather than the process-level default sandbox — so
 * a Cloud Run run shows Cloud Run, and a local-k8s run shows the local cluster.
 * For Cloud Run, the environment is a clickable link into the GCP console.
 */
const RunEnvironmentPanel: React.FC<{ run: RunDetail }> = ({ run }) => {
  const isLocal = (run.provider ?? 'local-k8s') === 'local-k8s';
  const providerLabel = isLocal ? 'local-k8s' : run.provider ?? 'cloud-run';
  const cloudEnv = !isLocal && run.kubeContext ? parseCloudRunEnv(run.kubeContext) : undefined;
  const consoleUrl = cloudEnv ? cloudRunConsoleUrl(cloudEnv.project, cloudEnv.region) : undefined;

  const environmentValue = consoleUrl ? (
    <EuiLink href={consoleUrl} target="_blank" external>
      {run.kubeContext}
    </EuiLink>
  ) : (
    run.kubeContext || '—'
  );

  const items = [
    { title: 'Provider', description: providerLabel },
    { title: 'Environment', description: environmentValue },
    ...(run.namespace ? [{ title: isLocal ? 'Namespace' : 'Region', description: run.namespace }] : []),
    { title: 'Sandbox', description: run.podName },
  ];
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{labels.cluster}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {consoleUrl ? (
            <EuiLink href={consoleUrl} target="_blank" external={false}>
              <EuiBadge color="primary" iconType="cloudSunny">
                {labels.cloud}
              </EuiBadge>
            </EuiLink>
          ) : (
            <EuiBadge color={isLocal ? 'success' : 'primary'} iconType={isLocal ? 'desktop' : 'cloudSunny'}>
              {isLocal ? labels.local : labels.cloud}
            </EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="responsiveColumn"
        compressed
        columnWidths={[1, 3]}
        listItems={items}
        descriptionProps={{ style: { wordBreak: 'break-all' } }}
      />
    </EuiPanel>
  );
};

const ExecPanel: React.FC<{ podName: string }> = ({ podName }) => {
  const { http } = useKibana().services;
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ exitCode: number; stdout: string; stderr: string } | null>(
    null
  );

  const run = useCallback(async () => {
    if (!command.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await http.post<{ exitCode: number; stdout: string; stderr: string }>(
        `${internalApiPath}/sandboxes/${podName}/exec`,
        { body: JSON.stringify({ command }) }
      );
      setResult(res);
    } catch (e) {
      setResult({ exitCode: -1, stdout: '', stderr: (e as Error).message });
    } finally {
      setRunning(false);
    }
  }, [command, http, podName]);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiText size="s">
        <strong>{labels.exec}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFieldText
            compressed
            placeholder="ls -la /workspace"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run();
            }}
            fullWidth
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={run} isLoading={running} iconType="play">
            {labels.execRun}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {result && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color={result.exitCode === 0 ? 'success' : 'danger'}>
            {i18n.translate('xpack.agentBuilder.sandboxExecutions.exitCode', {
              defaultMessage: 'exit {code}',
              values: { code: result.exitCode },
            })}
          </EuiText>
          {result.stdout && (
            <EuiCodeBlock fontSize="s" paddingSize="s" overflowHeight={200} isCopyable>
              {result.stdout}
            </EuiCodeBlock>
          )}
          {result.stderr && (
            <EuiCodeBlock fontSize="s" paddingSize="s" overflowHeight={160} isCopyable>
              {result.stderr}
            </EuiCodeBlock>
          )}
        </>
      )}
    </EuiPanel>
  );
};

export const SandboxExecutionsFlyout: React.FC<{
  conversationId: string;
  onClose: () => void;
}> = ({ conversationId, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const { http } = useKibana().services;
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const [detail, setDetail] = useState<RunDetail | undefined>();
  const [liveTimeline, setLiveTimeline] = useState<OpencodeTimelineItem[] | undefined>();
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await http.get<{ runs: RunSummary[] }>(
        `${internalApiPath}/conversations/${conversationId}/opencode_runs`
      );
      setRuns(res.runs);
      setSelectedRunId((cur) => cur ?? res.runs[res.runs.length - 1]?.runId);
    } finally {
      setLoading(false);
    }
  }, [conversationId, http]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Poll the runs list (so a new run started from the chat appears here live).
  useEffect(() => {
    const interval = setInterval(fetchRuns, 3000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  // Load the selected run's full detail.
  useEffect(() => {
    if (!selectedRunId) return;
    setLiveTimeline(undefined);
    http
      .get<{ run: RunDetail }>(`${internalApiPath}/opencode_runs/${selectedRunId}`)
      .then((res) => setDetail(res.run))
      .catch(() => setDetail(undefined));
  }, [selectedRunId, http]);

  // If the selected run is still running, stream its live timeline.
  const selectedIsRunning =
    runs.find((r) => r.runId === selectedRunId)?.status === 'running' ||
    detail?.status === 'running';

  useEffect(() => {
    if (!selectedRunId || !selectedIsRunning) return;
    const abortController = new AbortController();
    const subscription = defer(() =>
      http.get(`${internalApiPath}/opencode_runs/${selectedRunId}/live`, {
        signal: abortController.signal,
        asResponse: true,
        rawResponse: true,
      })
    )
      .pipe(httpResponseIntoObservable<LiveRunEvent>())
      .subscribe({
        next: (event: LiveRunEvent) => {
          if (event.timeline) setLiveTimeline(event.timeline);
        },
        error: () => {},
        complete: () => {
          // Refresh once more to pick up the final answer/status.
          fetchRuns();
          http
            .get<{ run: RunDetail }>(`${internalApiPath}/opencode_runs/${selectedRunId}`)
            .then((res) => setDetail(res.run))
            .catch(() => {});
        },
      });
    return () => {
      subscription.unsubscribe();
      abortController.abort();
    };
  }, [selectedRunId, selectedIsRunning, http, fetchRuns]);

  const timeline = liveTimeline ?? detail?.timeline ?? [];
  const selectedRunSummary = useMemo(
    () => runs.find((r) => r.runId === selectedRunId),
    [runs, selectedRunId]
  );

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus aria-labelledby="agentBuilderSandboxExecutions">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="agentBuilderSandboxExecutions">{labels.title}</h2>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {labels.subtitle}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {detail && (
          <>
            <RunEnvironmentPanel run={detail} />
            <EuiSpacer size="m" />
          </>
        )}

        {loading && runs.length === 0 ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" css={{ minHeight: 120 }}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexGroup>
        ) : runs.length === 0 ? (
          <EuiEmptyPrompt
            iconType="compute"
            title={<h3>{labels.none}</h3>}
            body={<p>{labels.noneBody}</p>}
          />
        ) : (
          <>
            {/* Run selector */}
            <EuiFlexGroup direction="column" gutterSize="xs">
              {runs.map((run) => {
                const isSelected = run.runId === selectedRunId;
                return (
                  <EuiFlexItem grow={false} key={run.runId}>
                    <EuiPanel
                      hasShadow={false}
                      hasBorder
                      paddingSize="s"
                      onClick={() => setSelectedRunId(run.runId)}
                      css={css`
                        cursor: pointer;
                        border-color: ${isSelected
                          ? euiTheme.colors.borderStrongPrimary
                          : euiTheme.border.color};
                      `}
                    >
                      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                        <EuiFlexItem grow={false}>
                          {run.status === 'running' ? (
                            <EuiLoadingSpinner size="s" />
                          ) : (
                            <EuiHealth color={statusColor(run.status)} />
                          )}
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText
                            size="xs"
                            css={css`
                              font-family: ${euiTheme.font.familyCode};
                            `}
                          >
                            {run.podName}
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="hollow">{run.status}</EuiBadge>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="xs" color="subdued">
                            {relativeTime(run.createdAt)}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>

            <EuiHorizontalRule margin="m" />

            {/* Selected run: exec (if running) + activity timeline */}
            {selectedIsRunning && selectedRunSummary && (
              <>
                <ExecPanel podName={selectedRunSummary.podName} />
                <EuiSpacer size="m" />
              </>
            )}

            {timeline.length ? (
              <OpencodeTimeline timeline={timeline} autoExpand={selectedIsRunning} />
            ) : (
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.agentBuilder.sandboxExecutions.noActivity', {
                  defaultMessage: 'No activity recorded for this run.',
                })}
              </EuiText>
            )}

            {detail?.answer && (
              <>
                <EuiSpacer size="m" />
                <EuiPanel hasShadow={false} hasBorder paddingSize="m">
                  <EuiText size="s">{detail.answer}</EuiText>
                </EuiPanel>
              </>
            )}
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
