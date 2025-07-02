/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { IngestStreamLifecycle, Streams, isIlmLifecycle, isRoot } from '@kbn/streams-schema';
import { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { css } from '@emotion/react';
import { useKibana } from '../../../hooks/use_kibana';
import { EditLifecycleModal, LifecycleEditAction } from './modal';
import { RetentionSummary } from './summary';
import { RetentionMetadata } from './metadata';
import { IlmSummary } from './ilm_summary';
import { IngestionRate } from './ingestion_rate';
import { useDataStreamStats } from './hooks/use_data_stream_stats';
import { getFormattedError } from '../../../util/errors';

function useLifecycleState({
  definition,
  isServerless,
}: {
  definition: Streams.ingest.all.GetResponse;
  isServerless: boolean;
}) {
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const [openEditModal, setOpenEditModal] = useState<LifecycleEditAction>('none');

  const lifecycleActions = useMemo(() => {
    const actions: Array<{ name: string; action: LifecycleEditAction }> = [];
    const isWired = Streams.WiredStream.GetResponse.is(definition);

    actions.push({
      name: i18n.translate('xpack.streams.streamDetailLifecycle.setRetentionDays', {
        defaultMessage: 'Set specific retention days',
      }),
      action: 'dsl',
    });

    if (!isServerless) {
      actions.push({
        name: i18n.translate('xpack.streams.streamDetailLifecycle.setLifecyclePolicy', {
          defaultMessage: 'Use a lifecycle policy',
        }),
        action: 'ilm',
      });
    }

    if (isWired && !isRoot(definition.stream.name)) {
      actions.push({
        name: i18n.translate('xpack.streams.streamDetailLifecycle.resetToDefault', {
          defaultMessage: 'Reset to default',
        }),
        action: 'inherit',
      });
    }

    return actions;
  }, [definition, isServerless]);

  return {
    lifecycleActions,
    openEditModal,
    setOpenEditModal,
    updateInProgress,
    setUpdateInProgress,
  };
}

export function StreamDetailLifecycle({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    core: { http, notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    isServerless,
  } = useKibana();

  const {
    lifecycleActions,
    openEditModal,
    setOpenEditModal,
    updateInProgress,
    setUpdateInProgress,
  } = useLifecycleState({ definition, isServerless });

  const {
    stats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useDataStreamStats({ definition });

  const { signal } = useAbortController();

  const getIlmPolicies = () =>
    http.get<PolicyFromES[]>('/api/index_lifecycle_management/policies', {
      signal,
    });

  const updateLifecycle = async (lifecycle: IngestStreamLifecycle) => {
    try {
      setUpdateInProgress(true);

      const request = {
        ingest: {
          ...definition.stream.ingest,
          lifecycle,
        },
      };

      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
        params: {
          path: { name: definition.stream.name },
          body: request,
        },
        signal,
      });

      refreshDefinition();
      setOpenEditModal('none');

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailLifecycle.updated', {
          defaultMessage: 'Stream lifecycle updated',
        }),
      });
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.streamDetailLifecycle.failed', {
          defaultMessage: 'Failed to update lifecycle',
        }),
        toastMessage: getFormattedError(error).message,
      });
    } finally {
      setUpdateInProgress(false);
    }
  };

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EditLifecycleModal
        action={openEditModal}
        definition={definition}
        closeModal={() => setOpenEditModal('none')}
        updateLifecycle={updateLifecycle}
        getIlmPolicies={getIlmPolicies}
        updateInProgress={updateInProgress}
      />
      <EuiFlexGroup gutterSize="m" css={flexRowCss}>
        <EuiPanel grow={false} hasShadow={false} hasBorder paddingSize="m">
          <RetentionSummary
            definition={definition}
            isLoadingStats={isLoadingStats}
            stats={stats}
            statsError={statsError}
          />
        </EuiPanel>
        <EuiPanel grow hasShadow={false} hasBorder paddingSize="m">
          <RetentionMetadata
            definition={definition}
            lifecycleActions={lifecycleActions}
            openEditModal={(action) => setOpenEditModal(action)}
            isLoadingStats={isLoadingStats}
            stats={stats}
            statsError={statsError}
          />
        </EuiPanel>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="m" css={flexRowCss}>
        {definition.privileges.monitor && (
          <EuiFlexItem grow={2}>
            <EuiPanel hasShadow={false} hasBorder paddingSize="m">
              <IngestionRate
                definition={definition}
                isLoadingStats={isLoadingStats}
                stats={stats}
              />
            </EuiPanel>
          </EuiFlexItem>
        )}
        {definition.privileges.lifecycle && isIlmLifecycle(definition.effective_lifecycle) ? (
          <EuiFlexItem grow={3}>
            <EuiPanel hasShadow={false} hasBorder paddingSize="m">
              <IlmSummary definition={definition} lifecycle={definition.effective_lifecycle} />
            </EuiPanel>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

const flexRowCss = css`
  flex-grow: 0;
`;
