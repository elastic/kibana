/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import {
  IngestStreamGetResponse,
  IngestStreamLifecycle,
  IngestUpsertRequest,
  isIlmLifecycle,
  isRoot,
  isUnwiredStreamGetResponse,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import {
  ILM_LOCATOR_ID,
  IlmLocatorParams,
  PolicyFromES,
} from '@kbn/index-lifecycle-management-common-shared';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
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
  definition?: IngestStreamGetResponse;
  isServerless: boolean;
}) {
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const [openEditModal, setOpenEditModal] = useState<LifecycleEditAction>('none');

  const lifecycleActions = useMemo(() => {
    if (!definition) return [];

    const actions: Array<{ name: string; action: LifecycleEditAction }> = [];
    const isWired = isWiredStreamGetResponse(definition);
    const isUnwired = isUnwiredStreamGetResponse(definition);
    const isIlm = isIlmLifecycle(definition.effective_lifecycle);

    if (isWired || (isUnwired && !isIlm)) {
      actions.push({
        name: i18n.translate('xpack.streams.streamDetailLifecycle.setRetentionDays', {
          defaultMessage: 'Set specific retention days',
        }),
        action: 'dsl',
      });
    }

    if (isWired && !isServerless) {
      actions.push({
        name: i18n.translate('xpack.streams.streamDetailLifecycle.setLifecyclePolicy', {
          defaultMessage: 'Use a lifecycle policy',
        }),
        action: 'ilm',
      });
    }

    if (!isRoot(definition.stream.name) || (isUnwired && !isIlm)) {
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
  definition?: IngestStreamGetResponse;
  refreshDefinition: () => void;
}) {
  const {
    core: { http, notifications },
    dependencies: {
      start: {
        share,
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
    refresh: refreshStats,
    error: statsError,
  } = useDataStreamStats({ definition });

  const { signal } = useAbortController();

  if (!definition) {
    return null;
  }

  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);

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
      } as IngestUpsertRequest;

      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest', {
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
    <>
      <EditLifecycleModal
        action={openEditModal}
        definition={definition}
        closeModal={() => setOpenEditModal('none')}
        updateLifecycle={updateLifecycle}
        getIlmPolicies={getIlmPolicies}
        updateInProgress={updateInProgress}
        ilmLocator={ilmLocator}
      />

      <EuiPanel grow={false} hasShadow={false} hasBorder paddingSize="s">
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={1}>
            <RetentionSummary definition={definition} />
          </EuiFlexItem>

          <EuiFlexItem grow={4}>
            <RetentionMetadata
              definition={definition}
              lifecycleActions={lifecycleActions}
              ilmLocator={ilmLocator}
              openEditModal={(action) => setOpenEditModal(action)}
              isLoadingStats={isLoadingStats}
              stats={stats}
              statsError={statsError}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={2}>
            <EuiPanel grow={true} hasShadow={false} hasBorder paddingSize="s">
              <IngestionRate
                definition={definition}
                refreshStats={refreshStats}
                isLoadingStats={isLoadingStats}
                stats={stats}
              />
            </EuiPanel>
          </EuiFlexItem>

          {isIlmLifecycle(definition.effective_lifecycle) ? (
            <EuiFlexItem grow={3}>
              <EuiPanel grow={true} hasShadow={false} hasBorder paddingSize="s">
                <IlmSummary
                  definition={definition}
                  lifecycle={definition.effective_lifecycle}
                  ilmLocator={ilmLocator}
                />
              </EuiPanel>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
}
