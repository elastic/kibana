/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGrid, useIsWithinMinBreakpoint } from '@elastic/eui';
import { formatBytes } from '../../../../../lib/format_bytes';
import type { Index } from '../../../../../../../common';
import { loadIndexDocCount } from '../../../../../services/api';
import { StorageDetails } from './storage_details';
import { StatusDetails } from './status_details';
import { SizeDocCountDetails } from './size_doc_count_details';
import { AliasesDetails } from './aliases_details';
import { DataStreamDetails } from './data_stream_details';

export interface DocCountState {
  count?: number;
  isLoading: boolean;
  isError: boolean;
}
interface Props {
  indexDetails: Index;
}

export const QuickStats = ({ indexDetails }: Props) => {
  const isLarge = useIsWithinMinBreakpoint('xl');
  const {
    name,
    status,
    health,
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

  const [docCount, setDocCount] = useState<DocCountState>({ isLoading: true, isError: false });

  const fetchDocCount = useCallback(async () => {
    try {
      const { data, error } = await loadIndexDocCount(name);
      if (error || !data) {
        setDocCount({ isLoading: false, isError: true });
      } else {
        setDocCount({ count: data[name], isLoading: false, isError: false });
      }
    } catch {
      setDocCount({ isLoading: false, isError: true });
    }
  }, [name]);

  useEffect(() => {
    fetchDocCount();
  }, [fetchDocCount]);

  return (
    <EuiFlexGrid columns={isLarge ? 3 : 1}>
      <StorageDetails
        size={sizeFormatted}
        primarySize={primarySizeFormatted}
        primary={primary}
        replica={replica}
      />
      <StatusDetails
        docCount={docCount}
        documentsDeleted={documentsDeleted ?? 0}
        status={status}
        health={health}
      />
      <SizeDocCountDetails size={sizeFormatted} docCount={docCount} />
      <AliasesDetails aliases={aliases} />
      {dataStream && <DataStreamDetails dataStreamName={dataStream} />}
    </EuiFlexGrid>
  );
};
