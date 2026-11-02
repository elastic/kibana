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
import { useStreamFlyoutDetail } from '../../hooks/use_stream_flyout_detail';
import { StreamDetailLifecycle } from '../stream_management/data_management/stream_detail_lifecycle';
import type { StreamFlyoutProps } from '.';

export function StreamRetention({ name, onClose }: StreamFlyoutProps) {
  const { loading, definition, refresh } = useStreamFlyoutDetail();

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
        <StreamDetailLifecycle definition={definition} refreshDefinition={refresh} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
