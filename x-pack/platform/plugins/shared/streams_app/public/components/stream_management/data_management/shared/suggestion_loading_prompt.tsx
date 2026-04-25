/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSkeletonText,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface SuggestionLoadingPromptProps {
  onCancel(): void;
}

export function SuggestionLoadingPrompt({ onCancel }: SuggestionLoadingPromptProps) {
  return (
    <EuiCallOut
      iconType="sparkles"
      title={i18n.translate('xpack.streams.stepsEditor.loadingDashboardsLabel', {
        defaultMessage: 'Analyzing your data...',
      })}
      color="primary"
      data-test-subj="streamsAppPipelineSuggestionLoadingPrompt"
    >
      <EuiFlexGroup direction="column" responsive={false} gutterSize="m">
        <EuiFlexItem>
          <EuiSkeletonText lines={3} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSkeletonText lines={3} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSkeletonText lines={3} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiProgress size="s" color="accent" />
      <EuiSpacer size="s" />
      <EuiLink onClick={onCancel} data-test-subj="streamsAppPipelineSuggestionCancelButton">
        {i18n.translate('xpack.streams.stepsEditor.cancelLabel', {
          defaultMessage: 'Cancel',
        })}
      </EuiLink>
    </EuiCallOut>
  );
}
