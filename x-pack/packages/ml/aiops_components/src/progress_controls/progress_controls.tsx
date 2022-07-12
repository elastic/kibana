/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiProgress, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

// TODO Consolidate with duplicate component `CorrelationsProgressControls` in
// `x-pack/plugins/apm/public/components/app/correlations/progress_controls.tsx`

interface ProgressControlProps {
  progress: number;
  progressMessage: string;
  onRefresh: () => void;
  onCancel: () => void;
  isRunning: boolean;
}

export function ProgressControls({
  progress,
  progressMessage,
  onRefresh,
  onCancel,
  isRunning,
}: ProgressControlProps) {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem data-test-subj="aiopProgressTitle">
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                data-test-subj="aiopsProgressTitleMessage"
                id="xpack.aiops.progressTitle"
                defaultMessage="Progress: {progress}% — {progressMessage}"
                values={{ progress: Math.round(progress * 100), progressMessage }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiProgress
              aria-label={i18n.translate('xpack.aiops.progressAriaLabel', {
                defaultMessage: 'Progress',
              })}
              value={Math.round(progress * 100)}
              max={100}
              size="m"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {!isRunning && (
          <EuiButton size="s" onClick={onRefresh}>
            <FormattedMessage id="xpack.aiops.refreshButtonTitle" defaultMessage="Refresh" />
          </EuiButton>
        )}
        {isRunning && (
          <EuiButton size="s" onClick={onCancel}>
            <FormattedMessage id="xpack.aiops.cancelButtonTitle" defaultMessage="Cancel" />
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
