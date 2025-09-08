/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';
import type { IngestStreamLifecycle, Streams } from '@kbn/streams-schema';
import { isIlmLifecycle } from '@kbn/streams-schema';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { css } from '@emotion/react';
import { useKibana } from '../../../../hooks/use_kibana';
import { EditLifecycleModal } from './modal';
import { IlmSummary } from './ilm_summary';
import { IngestionRate } from './ingestion_rate';
import { useDataStreamStats } from '../hooks/use_data_stream_stats';
import { getFormattedError } from '../../../../util/errors';
import { RetentionCard } from './cards/retention_card';
import { StorageSizeCard } from './cards/storage_size_card';
import { IngestionCard } from './cards/ingestion_card';
import { useLifecycleState } from '../hooks/use_lifecycle_state';
export const StreamDetailGeneralData = ({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}) => {
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
    <>
      <EditLifecycleModal
        action={openEditModal}
        definition={definition}
        closeModal={() => setOpenEditModal('none')}
        updateLifecycle={updateLifecycle}
        getIlmPolicies={getIlmPolicies}
        updateInProgress={updateInProgress}
      />
      <EuiText>
        <h4>
          {i18n.translate('xpack.streams.streamDetailLifecycle.generalData', {
            defaultMessage: 'General data',
          })}
        </h4>
      </EuiText>
      <EuiFlexGroup gutterSize="m" css={flexRowCss}>
        <EuiFlexItem grow={1}>
          <RetentionCard
            definition={definition}
            lifecycleActions={lifecycleActions}
            openEditModal={setOpenEditModal}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <StorageSizeCard definition={definition} stats={stats} statsError={statsError} />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <IngestionCard definition={definition} stats={stats} statsError={statsError} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {definition.privileges.lifecycle && isIlmLifecycle(definition.effective_lifecycle) ? (
        <EuiPanel hasShadow={false} hasBorder paddingSize="m" grow={false}>
          <IlmSummary definition={definition} stats={stats} />
        </EuiPanel>
      ) : null}
      {definition.privileges.monitor && (
        <EuiPanel hasShadow={false} hasBorder paddingSize="m" grow={false}>
          <IngestionRate definition={definition} isLoadingStats={isLoadingStats} stats={stats} />
        </EuiPanel>
      )}
    </>
  );
};

const flexRowCss = css`
  flex-grow: 0;
`;
