/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiText,
  EuiEmptyPrompt,
  EuiLoadingLogo,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface LoadingPromptProps {
  onCancel(): void;
}

export function LoadingPrompt({ onCancel }: LoadingPromptProps) {
  return (
    <EuiEmptyPrompt
      icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
      body={
        <EuiFlexGroup direction="column" responsive={false} alignItems="center" gutterSize="l">
          <EuiFlexItem>
            <EuiText>
              {i18n.translate('xpack.streams.stepsEditor.loadingDashboardsLabel', {
                defaultMessage: 'Analysing your documents...',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiLink onClick={onCancel}>
              {i18n.translate('xpack.streams.stepsEditor.cancelLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
}
