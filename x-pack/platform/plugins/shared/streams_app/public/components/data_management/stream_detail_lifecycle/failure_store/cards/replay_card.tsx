/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  formatNumber,
} from '@elastic/eui';
import { useKibana } from '../../../../../hooks/use_kibana';
import {
  useFailureStoreReplay,
  type ReplayState,
} from '../../../../../hooks/use_failure_store_replay';
import type { EnhancedFailureStoreStats } from '../../hooks/use_data_stream_stats';

interface ReplayCardProps {
  streamName: string;
  stats?: EnhancedFailureStoreStats;
  hasPrivileges: boolean;
  onReplayComplete?: () => void;
}

const formatCount = (count?: number): string => {
  return count !== undefined ? formatNumber(count, '0,0') : '-';
};

const getProgressPercent = (state: ReplayState): number => {
  if (state.status !== 'in_progress' || !state.progress) return 0;
  const { total, created = 0, updated = 0, noops = 0, versionConflicts = 0 } = state.progress;
  if (!total || total === 0) return 0;
  const processed = created + updated + noops + versionConflicts;
  return Math.min(100, Math.round((processed / total) * 100));
};

export const ReplayCard: React.FC<ReplayCardProps> = ({
  streamName,
  stats,
  hasPrivileges,
  onReplayComplete,
}) => {
  const {
    core: { notifications },
  } = useKibana();

  const handleComplete = useCallback(() => {
    notifications.toasts.addSuccess({
      title: i18n.translate('xpack.streams.replayCard.replayCompleteTitle', {
        defaultMessage: 'Replay completed',
      }),
      text: i18n.translate('xpack.streams.replayCard.replayCompleteText', {
        defaultMessage: 'Failed documents have been replayed successfully.',
      }),
    });
    onReplayComplete?.();
  }, [notifications.toasts, onReplayComplete]);

  const handleError = useCallback(
    (error: string) => {
      notifications.toasts.addError(new Error(error), {
        title: i18n.translate('xpack.streams.replayCard.replayErrorTitle', {
          defaultMessage: 'Replay failed',
        }),
      });
    },
    [notifications.toasts]
  );

  const { state, startReplay, cancelReplay, isRunning, isStarting, hasCompleted, reset } =
    useFailureStoreReplay(streamName, {
      onComplete: handleComplete,
      onError: handleError,
    });

  // Reset after completion so button can be clicked again
  useEffect(() => {
    if (hasCompleted) {
      // Reset after a delay so user can see the completion state briefly
      const timer = setTimeout(() => {
        reset();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasCompleted, reset]);

  const docCount = stats?.count ?? 0;

  // Don't show the card if there are no failed documents
  if (docCount === 0 && !isRunning && state.status === 'not_started') {
    return null;
  }

  // Don't show if user doesn't have privileges
  if (!hasPrivileges) {
    return null;
  }

  const progressPercent = getProgressPercent(state);

  const renderContent = () => {
    if (isRunning) {
      return (
        <>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="s">
                {i18n.translate('xpack.streams.replayCard.replayingProgress', {
                  defaultMessage: 'Replaying failed documents...',
                })}
              </EuiText>
            </EuiFlexItem>
            {state.progress?.total !== undefined && (
              <EuiFlexItem>
                <EuiProgress
                  value={progressPercent}
                  max={100}
                  size="m"
                  color="primary"
                  data-test-subj="replayProgress"
                />
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.streams.replayCard.progressStats', {
                    defaultMessage:
                      '{created} created · {versionConflicts} conflicts · {total} total',
                    values: {
                      created: formatCount(state.progress.created),
                      versionConflicts: formatCount(state.progress.versionConflicts),
                      total: formatCount(state.progress.total),
                    },
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiButtonEmpty
            size="s"
            color="danger"
            onClick={cancelReplay}
            data-test-subj="cancelReplayButton"
          >
            {i18n.translate('xpack.streams.replayCard.cancelReplay', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </>
      );
    }

    if (hasCompleted) {
      return (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiText size="s" color="success">
              {i18n.translate('xpack.streams.replayCard.replayCompleted', {
                defaultMessage: 'Replay completed successfully!',
              })}
            </EuiText>
          </EuiFlexItem>
          {state.progress && (
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.replayCard.completedStats', {
                  defaultMessage: '{created} documents replayed in {took}ms',
                  values: {
                    created: formatCount(state.progress.created),
                    took: formatCount(state.progress.took),
                  },
                })}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    }

    if (state.status === 'failed') {
      return (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiText size="s" color="danger">
              {i18n.translate('xpack.streams.replayCard.replayFailed', {
                defaultMessage: 'Replay failed: {error}',
                values: { error: state.error || 'Unknown error' },
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              size="s"
              color="primary"
              onClick={startReplay}
              data-test-subj="retryReplayButton"
            >
              {i18n.translate('xpack.streams.replayCard.retryReplay', {
                defaultMessage: 'Retry',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (state.status === 'canceled') {
      return (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.replayCard.replayCanceled', {
                defaultMessage: 'Replay was canceled',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              size="s"
              color="primary"
              onClick={startReplay}
              disabled={docCount === 0}
              data-test-subj="replayFailedDocsButton"
            >
              {i18n.translate('xpack.streams.replayCard.replayFailedDocs', {
                defaultMessage: 'Replay failed docs',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    // Default: not_started state
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">
            {i18n.translate('xpack.streams.replayCard.replayDescription', {
              defaultMessage:
                'Replay ingest pipeline failures back into the data stream. This will attempt to re-ingest documents that failed due to pipeline errors.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="primary"
            onClick={startReplay}
            isLoading={isStarting}
            disabled={docCount === 0}
            data-test-subj="replayFailedDocsButton"
          >
            {i18n.translate('xpack.streams.replayCard.replayFailedDocs', {
              defaultMessage: 'Replay failed docs',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiPanel hasShadow={false} hasBorder grow color="subdued" data-test-subj="replayCard">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <b>
              {i18n.translate('xpack.streams.replayCard.title', {
                defaultMessage: 'Replay failed documents',
              })}
            </b>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>{renderContent()}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
