/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiText,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface SuggestPipelineLoadingPromptProps {
  onCancel(): void;
}

export function SuggestPipelineLoadingPrompt({ onCancel }: SuggestPipelineLoadingPromptProps) {
  return (
    <>
      <EuiProgress size="xs" color="primary" />
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" responsive={false} gutterSize="xs">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.stepsEditor.loadingDashboardsLabel', {
              defaultMessage: 'Analysing your data...',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSkeletonText lines={3} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSkeletonText lines={3} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSkeletonText lines={3} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiLink onClick={onCancel}>
            {i18n.translate('xpack.streams.stepsEditor.cancelLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
