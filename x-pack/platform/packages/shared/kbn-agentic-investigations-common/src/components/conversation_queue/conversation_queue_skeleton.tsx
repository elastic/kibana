/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSkeletonTitle,
  useEuiTheme,
} from '@elastic/eui';
import { LOADING_CONVERSATION_QUEUE } from './translations';

interface ConversationQueueSkeletonProps {
  rows: number;
}

/** Shaped like ConversationCard, so the list does not resize when the rows land. */
export const ConversationQueueSkeleton = ({ rows }: ConversationQueueSkeletonProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      aria-label={LOADING_CONVERSATION_QUEUE}
      aria-busy
    >
      {Array.from({ length: rows }, (_, row) => (
        <EuiFlexItem key={row} grow={false}>
          <EuiPanel
            paddingSize="l"
            hasShadow={false}
            hasBorder={false}
            borderRadius="none"
            css={{
              borderBottom: row < rows - 1 ? `1px solid ${euiTheme.colors.disabled}` : 'none',
            }}
          >
            <EuiSkeletonTitle size="xxs" css={{ inlineSize: '40%' }} />
            <EuiSkeletonText lines={2} size="s" />
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
