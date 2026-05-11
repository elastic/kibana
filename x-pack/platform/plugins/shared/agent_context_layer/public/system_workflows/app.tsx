/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCode,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ApplicationStart, HttpStart, NotificationsStart } from '@kbn/core/public';
import type { WorkflowListDto, WorkflowListItemDto } from '@kbn/workflows';
import {
  systemWorkflowCancelExecutionPath,
  systemWorkflowsInstallPath,
  systemWorkflowStartPath,
  systemWorkflowsListPath,
  type SmlSystemWorkflowProgress,
} from '../../common/constants';

/**
 * Local extension of `WorkflowListItemDto`. The ACL list route hydrates each
 * running row with a per-execution progress summary; the upstream
 * `WorkflowListItemDto` doesn't know about it.
 */
type SmlSystemWorkflowListItem = WorkflowListItemDto & {
  progress?: SmlSystemWorkflowProgress;
};

/**
 * How often to refetch the list while at least one workflow is actively
 * running. Five seconds matches the workflows app's own detail-page polling
 * cadence and keeps the load on the workflows API negligible (we issue at
 * most two extra `getWorkflowExecution` calls per refresh).
 */
const PROGRESS_POLL_INTERVAL_MS = 5_000;

/**
 * History-entry statuses that mean "this execution is still in flight" and
 * therefore worth polling for live progress updates.
 *
 * MUST stay in sync with `ACTIVE_HISTORY_STATUSES` in
 * `server/routes/system_workflows.ts` — otherwise the client either polls
 * for rows the server doesn't enrich (cheap noise) or, worse, stops polling
 * while the server still has live data to send. In particular, a parent
 * crawl execution sits in `waiting` (not `running`) while its spawned child
 * augmentation runs, so omitting `waiting` would silently break refresh for
 * the very workflow most likely to be in progress.
 */
const ACTIVE_HISTORY_STATUSES = new Set([
  'running',
  'pending',
  'waiting',
  'waiting_for_input',
]);

interface InstallResult {
  created: string[];
  skipped: string[];
  updated: string[];
  reinstalled: string[];
  failed: Array<{ id: string; reason: string }>;
}

export interface SystemWorkflowsAppProps {
  http: HttpStart;
  application: ApplicationStart;
  notifications: NotificationsStart;
  canManage: boolean;
}

export const SystemWorkflowsApp = ({
  http,
  application,
  notifications,
  canManage,
}: SystemWorkflowsAppProps) => {
  const [data, setData] = useState<WorkflowListDto | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [installing, setInstalling] = useState<boolean>(false);

  /**
   * Refetch the list. `silent` skips the spinner so the polling refresh
   * doesn't make the table flicker between renders.
   */
  const fetchList = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const response = await http.get<WorkflowListDto>(systemWorkflowsListPath);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [http]
  );

  useEffect(() => {
    if (canManage) {
      fetchList().catch(() => {
        /* state already captured */
      });
    } else {
      setLoading(false);
    }
  }, [fetchList, canManage]);

  // While at least one workflow row is still in flight we poll the list so
  // the progress column ticks live. We watch the latest history entry per
  // row using the *same* status set the server uses to decide whether to
  // enrich `progress` — keeping the two in lockstep guarantees that "the
  // server has live data" and "the client is polling" stay aligned.
  const hasActiveRun = useMemo(() => {
    if (!data?.results) return false;
    return data.results.some((item) => {
      const latest = item.history?.[0];
      return !!latest && ACTIVE_HISTORY_STATUSES.has(latest.status);
    });
  }, [data]);

  useEffect(() => {
    if (!canManage || !hasActiveRun) return undefined;
    const handle = setInterval(() => {
      fetchList({ silent: true }).catch(() => {
        /* surfaced via state */
      });
    }, PROGRESS_POLL_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [canManage, hasActiveRun, fetchList]);

  const onStart = useCallback(
    async (item: WorkflowListItemDto) => {
      setBusyId(item.id);
      try {
        const path = systemWorkflowStartPath.replace('{id}', encodeURIComponent(item.id));
        const result = await http.post<{ executionId: string }>(path, {
          body: JSON.stringify({ inputs: {} }),
        });
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.agentContextLayer.app.startSuccess', {
            defaultMessage: 'Started "{name}"',
            values: { name: item.name ?? item.id },
          }),
          text: i18n.translate('xpack.agentContextLayer.app.startSuccessSubtitle', {
            defaultMessage: 'Execution id: {id}',
            values: { id: result.executionId },
          }),
        });
        await fetchList();
      } catch (err) {
        notifications.toasts.addError(err instanceof Error ? err : new Error(String(err)), {
          title: i18n.translate('xpack.agentContextLayer.app.startError', {
            defaultMessage: 'Failed to start "{name}"',
            values: { name: item.name ?? item.id },
          }),
        });
      } finally {
        setBusyId(null);
      }
    },
    [fetchList, http, notifications]
  );

  const onCancelLast = useCallback(
    async (item: WorkflowListItemDto) => {
      const latestRunning = (item.history ?? []).find((entry) =>
        ACTIVE_HISTORY_STATUSES.has(entry.status)
      );
      if (!latestRunning) {
        notifications.toasts.addWarning(
          i18n.translate('xpack.agentContextLayer.app.cancelNoRunning', {
            defaultMessage: 'No active execution to cancel for "{name}".',
            values: { name: item.name ?? item.id },
          })
        );
        return;
      }
      setBusyId(item.id);
      try {
        const path = systemWorkflowCancelExecutionPath
          .replace('{id}', encodeURIComponent(item.id))
          .replace('{executionId}', encodeURIComponent(latestRunning.id));
        await http.post(path);
        notifications.toasts.addSuccess(
          i18n.translate('xpack.agentContextLayer.app.cancelSuccess', {
            defaultMessage: 'Requested cancellation for "{name}".',
            values: { name: item.name ?? item.id },
          })
        );
        await fetchList();
      } catch (err) {
        notifications.toasts.addError(err instanceof Error ? err : new Error(String(err)), {
          title: i18n.translate('xpack.agentContextLayer.app.cancelError', {
            defaultMessage: 'Failed to cancel execution for "{name}"',
            values: { name: item.name ?? item.id },
          }),
        });
      } finally {
        setBusyId(null);
      }
    },
    [fetchList, http, notifications]
  );

  const onEdit = useCallback(
    (item: WorkflowListItemDto) => {
      application.navigateToApp('workflows', { path: `/${encodeURIComponent(item.id)}` });
    },
    [application]
  );

  const onInstall = useCallback(async () => {
    setInstalling(true);
    try {
      const result = await http.post<InstallResult>(systemWorkflowsInstallPath);
      const { created, skipped, updated, reinstalled, failed } = result;
      if (failed.length > 0) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.agentContextLayer.app.installPartialTitle', {
            defaultMessage: 'Some workflows failed to install',
          }),
          text: failed.map((f) => `${f.id}: ${f.reason}`).join('\n'),
        });
      } else {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.agentContextLayer.app.installSuccess', {
            defaultMessage:
              'Installed {createdCount}; refreshed {updatedCount}; reinstalled {reinstalledCount}; {skippedCount} already up to date.',
            values: {
              createdCount: created.length,
              updatedCount: updated.length,
              reinstalledCount: reinstalled.length,
              skippedCount: skipped.length,
            },
          })
        );
      }
      await fetchList();
    } catch (err) {
      notifications.toasts.addError(err instanceof Error ? err : new Error(String(err)), {
        title: i18n.translate('xpack.agentContextLayer.app.installError', {
          defaultMessage: 'Failed to install system workflows',
        }),
      });
    } finally {
      setInstalling(false);
    }
  }, [fetchList, http, notifications]);

  const columns = useMemo<Array<EuiBasicTableColumn<SmlSystemWorkflowListItem>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.agentContextLayer.app.column.name', {
          defaultMessage: 'Name',
        }),
        render: (name: string, item: SmlSystemWorkflowListItem) => (
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{name ?? item.id}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {item.id}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'enabled',
        name: i18n.translate('xpack.agentContextLayer.app.column.enabled', {
          defaultMessage: 'Enabled',
        }),
        width: '120px',
        render: (enabled: boolean) =>
          enabled ? (
            <EuiBadge color="success">
              <FormattedMessage
                id="xpack.agentContextLayer.app.column.enabledBadge"
                defaultMessage="Enabled"
              />
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow">
              <FormattedMessage
                id="xpack.agentContextLayer.app.column.disabledBadge"
                defaultMessage="Disabled"
              />
            </EuiBadge>
          ),
      },
      {
        field: 'history',
        name: i18n.translate('xpack.agentContextLayer.app.column.lastRun', {
          defaultMessage: 'Last run',
        }),
        width: '180px',
        render: (_history: unknown, item: SmlSystemWorkflowListItem) => {
          const last = item.history?.[0];
          if (!last) {
            return (
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.agentContextLayer.app.column.noLastRun"
                  defaultMessage="—"
                />
              </EuiText>
            );
          }
          return (
            <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color={lastRunBadgeColor(last.status)}>{last.status}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {last.finishedAt ?? last.startedAt}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'progress',
        name: i18n.translate('xpack.agentContextLayer.app.column.progress', {
          defaultMessage: 'Progress',
        }),
        width: '220px',
        render: (_progress: unknown, item: SmlSystemWorkflowListItem) => (
          <ProgressCell item={item} />
        ),
      },
      {
        name: i18n.translate('xpack.agentContextLayer.app.column.actions', {
          defaultMessage: 'Actions',
        }),
        width: '180px',
        render: (item: SmlSystemWorkflowListItem) => {
          const isBusy = busyId === item.id;
          const hasActive = (item.history ?? []).some((entry) =>
            ACTIVE_HISTORY_STATUSES.has(entry.status)
          );
          return (
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('xpack.agentContextLayer.app.actions.startTooltip', {
                    defaultMessage: 'Start workflow now',
                  })}
                >
                  <EuiButtonIcon
                    iconType="play"
                    aria-label="Start"
                    isDisabled={isBusy || !canManage}
                    onClick={() => onStart(item)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('xpack.agentContextLayer.app.actions.cancelTooltip', {
                    defaultMessage: 'Cancel latest active execution',
                  })}
                >
                  <EuiButtonIcon
                    iconType="cross"
                    aria-label="Cancel"
                    color="danger"
                    isDisabled={isBusy || !canManage || !hasActive}
                    onClick={() => onCancelLast(item)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('xpack.agentContextLayer.app.actions.editTooltip', {
                    defaultMessage: 'Edit in workflows management',
                  })}
                >
                  <EuiButtonIcon iconType="pencil" aria-label="Edit" onClick={() => onEdit(item)} />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ],
    [busyId, canManage, onCancelLast, onEdit, onStart]
  );

  if (!canManage) {
    return (
      <EuiPanel paddingSize="l">
        <EuiEmptyPrompt
          iconType="lock"
          title={
            <h2>
              <FormattedMessage
                id="xpack.agentContextLayer.app.unauthorizedTitle"
                defaultMessage="Restricted page"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.agentContextLayer.app.unauthorizedBody"
                defaultMessage="You do not have the 'Manage system workflows' privilege required to view this page."
              />
            </p>
          }
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="l">
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.agentContextLayer.app.title', {
          defaultMessage: 'Agent Context Layer',
        })}
        description={i18n.translate('xpack.agentContextLayer.app.description', {
          defaultMessage:
            'Manage the SML system workflows that maintain the Agent Context Layer. Workflows run as the user who starts them; the user must hold the workflow execution privilege.',
        })}
        rightSideItems={[
          <EuiButton
            key="install"
            iconType="download"
            onClick={onInstall}
            isLoading={installing}
            data-test-subj="aclInstallSystemWorkflowsButton"
          >
            <FormattedMessage
              id="xpack.agentContextLayer.app.install"
              defaultMessage="Install default workflows"
            />
          </EuiButton>,
          <EuiButton
            key="refresh"
            iconType="refresh"
            onClick={() => {
              fetchList().catch(() => {
                /* surfaced via state */
              });
            }}
            isLoading={loading}
          >
            <FormattedMessage id="xpack.agentContextLayer.app.refresh" defaultMessage="Refresh" />
          </EuiButton>,
        ]}
      />
      <EuiSpacer size="l" />
      {error && (
        <>
          <EuiCallOut
            color="danger"
            iconType="error"
            title={i18n.translate('xpack.agentContextLayer.app.loadErrorTitle', {
              defaultMessage: 'Failed to load system workflows',
            })}
          >
            {error.message}
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {loading ? (
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (data?.results?.length ?? 0) === 0 ? (
        <EuiEmptyPrompt
          iconType="indexOpen"
          title={
            <h2>
              <FormattedMessage
                id="xpack.agentContextLayer.app.emptyStateTitle"
                defaultMessage="No system workflows installed"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.agentContextLayer.app.emptyStateBody"
                defaultMessage="Install the bundled SML maintenance workflows to surface them here. You can edit or remove them later from the standard workflows management page."
              />
            </p>
          }
          actions={
            <EuiButton
              fill
              iconType="download"
              onClick={onInstall}
              isLoading={installing}
              data-test-subj="aclInstallSystemWorkflowsEmptyStateButton"
            >
              <FormattedMessage
                id="xpack.agentContextLayer.app.installEmptyState"
                defaultMessage="Install default workflows"
              />
            </EuiButton>
          }
        />
      ) : (
        <EuiBasicTable
          tableLayout="auto"
          itemId="id"
          items={(data?.results ?? []) as SmlSystemWorkflowListItem[]}
          columns={columns}
          rowProps={() => ({ 'data-test-subj': 'aclSystemWorkflowRow' })}
          noItemsMessage={i18n.translate('xpack.agentContextLayer.app.noWorkflows', {
            defaultMessage: 'No system workflows found.',
          })}
        />
      )}
    </EuiPanel>
  );
};

const lastRunBadgeColor = (status: string): 'success' | 'warning' | 'danger' | 'hollow' => {
  switch (status) {
    case 'completed':
    case 'succeeded':
      return 'success';
    case 'failed':
    case 'cancelled':
      return 'danger';
    case 'running':
    case 'pending':
      return 'warning';
    default:
      return 'hollow';
  }
};

/**
 * Per-row progress renderer. We intentionally keep the cell terse and
 * status-dependent: the column is wedged between "Last run" and "Actions" so
 * verbose copy would push the buttons off-screen.
 *
 *   - Crawl: `EuiProgress(value/total) + "indexing <currentIndex>"` while
 *     `total` is known. When `list_indices` hasn't produced output yet the
 *     bar degrades to an indeterminate spinner.
 *   - Augmentation: `<indexPattern>` + the current step id beneath. The
 *     index pattern matters most because the crawl spawns many augmentation
 *     children identified only by their input.
 *   - Anything else: em-dash so the column stays vertically aligned with
 *     completed/idle rows.
 */
const ProgressCell: React.FC<{ item: SmlSystemWorkflowListItem }> = ({ item }) => {
  const progress = item.progress;
  if (!progress) {
    return (
      <EuiText size="s" color="subdued">
        <FormattedMessage id="xpack.agentContextLayer.app.column.noProgress" defaultMessage="—" />
      </EuiText>
    );
  }

  if (progress.kind === 'crawl') {
    const totalLabel =
      progress.total !== null ? `${progress.completed}/${progress.total}` : `${progress.completed}/?`;
    const subline = progress.currentIndex
      ? i18n.translate('xpack.agentContextLayer.app.progress.crawlCurrent', {
          defaultMessage: 'Augmenting {indexPattern}',
          values: { indexPattern: progress.currentIndex },
        })
      : i18n.translate('xpack.agentContextLayer.app.progress.crawlIdle', {
          defaultMessage: 'Waiting for the next index…',
        });
    return (
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.agentContextLayer.app.progress.crawlSummary"
              defaultMessage="{count} indices augmented"
              values={{ count: <strong>{totalLabel}</strong> }}
            />
          </EuiText>
        </EuiFlexItem>
        {progress.total !== null && progress.total > 0 && (
          <EuiFlexItem grow={false}>
            <EuiProgress
              size="xs"
              max={progress.total}
              value={Math.min(progress.completed, progress.total)}
              color="primary"
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {subline}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {progress.indexPattern ? (
            <strong>{progress.indexPattern}</strong>
          ) : (
            <FormattedMessage
              id="xpack.agentContextLayer.app.progress.augmentationUnknownIndex"
              defaultMessage="Index pattern unresolved"
            />
          )}
        </EuiText>
      </EuiFlexItem>
      {progress.currentStep && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.agentContextLayer.app.progress.augmentationStep"
              defaultMessage="Step: {stepId}"
              values={{ stepId: <EuiCode>{progress.currentStep}</EuiCode> }}
            />
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
