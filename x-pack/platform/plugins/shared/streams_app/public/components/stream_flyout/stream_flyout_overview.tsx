/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Streams } from '@kbn/streams-schema';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { ErrorPrompt } from './error_prompt';
import { StreamOverview } from '../stream_detail_overview';
import { useStreamFlyoutDetail } from '../../hooks/use_stream_flyout_detail';
import type { StreamFlyoutProps } from '.';

export function StreamFlyoutOverview({ name, onClose }: StreamFlyoutProps) {
  const { loading, definition } = useStreamFlyoutDetail();

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiLoadingSpinner size="xxl" />
      </EuiFlexGroup>
    );
  }

  return !definition || Streams.QueryStream.GetResponse.is(definition) ? (
    <ErrorPrompt name={name} onClose={onClose} />
  ) : (
    <EuiFlexGroup>
      <EuiFlexItem>
        <StreamOverview />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
