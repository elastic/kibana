/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { RetentionCard } from './cards/retention_card';
import { StorageSizeCard } from './cards/storage_size_card';
import { IngestionCard } from './cards/ingestion_card';
import { FailureStoreIngestionRate } from './ingestion_rate';
import type { FailureStoreStats } from '../hooks/use_failure_store_stats';

export const FailureStoreInfo = ({
  openModal,
  definition,
  statsError,
  isLoadingStats,
  stats,
  config,
}: {
  openModal: (show: boolean) => void;
  definition: Streams.ingest.all.GetResponse;
  statsError: Error | undefined;
  isLoadingStats: boolean;
  stats?: FailureStoreStats;
  config: FailureStore;
}) => {
  return (
    <>
      <EuiText>
        <h4>
          {i18n.translate('xpack.streams.streamDetailView.failureStoreEnabled.title', {
            defaultMessage: 'Failure store ',
          })}
          <EuiIconTip
            content={i18n.translate('xpack.streams.streamDetailView.failureStoreEnabled.tooltip', {
              defaultMessage:
                'A failure store is a secondary set of indices inside a data stream, dedicated to storing failed documents.',
            })}
            position="right"
          />
        </h4>
      </EuiText>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <RetentionCard openModal={openModal} definition={definition} failureStore={config} />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <StorageSizeCard stats={stats} definition={definition} statsError={statsError} />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <IngestionCard stats={stats} definition={definition} statsError={statsError} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {definition.privileges.monitor && (
        <FailureStoreIngestionRate
          definition={definition}
          isLoadingStats={isLoadingStats}
          stats={stats}
        />
      )}
    </>
  );
};
