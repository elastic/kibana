/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, useIsWithinMinBreakpoint } from '@elastic/eui';
import { formatBytes } from '../../../../../lib/format_bytes';
import type { MappingsResponse, Index } from '../../../../../../../common';
import { StorageDetails } from './storage_details';
import { StatusDetails } from './status_details';
import { SizeDocCountDetails } from './size_doc_count_details';
import { AliasesDetails } from './aliases_details';
import { DataStreamDetails } from './data_stream_details';
import { AISearchQuickStats } from './ai_search_stats';

interface Props {
  indexDetails: Index;
  mappings: MappingsResponse | null | undefined;
}

export const QuickStats = ({ indexDetails, mappings }: Props) => {
  const isLarge = useIsWithinMinBreakpoint('xl');
  const {
    status,
    health,
    documents,
    documents_deleted: documentsDeleted,
    primary,
    replica,
    aliases,
    data_stream: dataStream,
    size,
    primary_size: primarySize,
  } = indexDetails;
  const sizeFormatted = formatBytes(size);
  const primarySizeFormatted = formatBytes(primarySize);

  return (
    <EuiFlexGrid columns={isLarge ? 3 : 1}>
      <StorageDetails
        size={sizeFormatted}
        primarySize={primarySizeFormatted}
        primary={primary}
        replica={replica}
      />
      <StatusDetails
        documents={documents}
        documentsDeleted={documentsDeleted!}
        status={status}
        health={health}
      />
      <SizeDocCountDetails size={sizeFormatted} documents={documents} />
      <AliasesDetails aliases={aliases} />
      {dataStream && <DataStreamDetails dataStreamName={dataStream} />}
      {mappings && <AISearchQuickStats mappings={mappings} />}
    </EuiFlexGrid>
  );
};
