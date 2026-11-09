/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiEmptyPromptProps, IconType } from '@elastic/eui';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React, { type ReactNode } from 'react';

interface AiIndexDetailPanelEmptyStateProps {
  iconType: IconType;
  dataTestSubj: string;
  message: ReactNode;
  action?: ReactNode;
  paddingSize?: EuiEmptyPromptProps['paddingSize'];
}

export const AiIndexDetailPanelEmptyState = ({
  iconType,
  dataTestSubj,
  message,
  action,
  paddingSize,
}: AiIndexDetailPanelEmptyStateProps) => {
  return (
    <EuiEmptyPrompt
      paddingSize={paddingSize ?? 'none'}
      data-test-subj={dataTestSubj}
      icon={<EuiIcon type={iconType} size="l" aria-hidden={true} color="subdued" />}
      body={
        action != null ? (
          <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued" textAlign="center">
                {message}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{action}</EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiText size="xs" color="subdued">
            {message}
          </EuiText>
        )
      }
    />
  );
};
