/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { isEnabledFailureStore } from '@kbn/streams-schema';
import { IndexInspectOverview } from './index_inspect_overview';
import { IndexInspectRetention } from './index_inspect_retention';
import type { IndexInspectTabId } from './types';
import type { IndexMetadataResponse } from './use_index_metadata';

export function IndexInspectPanels({
  indexName,
  tab,
  metadata,
  metadataLoading,
  canReadFailureStore = false,
}: {
  indexName: string;
  tab: IndexInspectTabId;
  metadata?: IndexMetadataResponse;
  metadataLoading: boolean;
  canReadFailureStore?: boolean;
}) {
  switch (tab) {
    case 'retention':
      return (
        <IndexInspectRetention
          indexName={indexName}
          metadata={metadata}
          metadataLoading={metadataLoading}
        />
      );
    case 'overview':
    default:
      // The ingest chart caches its first histogram query, so wait until failure store access is known.
      return metadataLoading && !metadata ? (
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiLoadingSpinner size="xl" />
        </EuiFlexGroup>
      ) : (
        <IndexInspectOverview
          indexName={indexName}
          isDataStream={metadata?.is_data_stream ?? false}
          canReadFailureStore={canReadFailureStore}
          failureStoreEnabled={Boolean(
            metadata?.is_data_stream && isEnabledFailureStore(metadata.effective_failure_store)
          )}
        />
      );
  }
}
