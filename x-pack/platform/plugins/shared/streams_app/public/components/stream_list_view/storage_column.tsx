/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatBytes } from '../stream_management/data_management/stream_detail_lifecycle/helpers/format_bytes';

interface StorageColumnProps {
  sizeBytes: number;
  isLoading: boolean;
  hasError?: boolean;
}

export function StorageColumn({ sizeBytes, isLoading, hasError }: StorageColumnProps) {
  if (isLoading) return <EuiLoadingSpinner size="s" />;

  if (hasError) {
    return (
      <EuiIconTip
        type="warning"
        color="warning"
        content={
          <FormattedMessage
            id="xpack.streams.storageColumn.errorTooltip"
            defaultMessage="Unable to load the storage size"
          />
        }
      />
    );
  }

  return <span>{formatBytes(sizeBytes)}</span>;
}
