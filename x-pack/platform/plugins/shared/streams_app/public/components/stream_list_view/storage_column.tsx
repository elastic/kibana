/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { formatBytes } from '../stream_management/data_management/stream_detail_lifecycle/helpers/format_bytes';

interface StorageColumnProps {
  sizeBytes: number;
  isLoading: boolean;
}

export function StorageColumn({ sizeBytes, isLoading }: StorageColumnProps) {
  if (isLoading) return <EuiLoadingSpinner size="s" />;

  return <span>{formatBytes(sizeBytes)}</span>;
}
