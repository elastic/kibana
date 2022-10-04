/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  useEuiTheme,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiProgress,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useAnimatedProgressBarBackground } from './use_animated_progress_bar_background';

// TODO Consolidate with duplicate component `CorrelationsProgressControls` in
// `x-pack/plugins/apm/public/components/app/correlations/progress_controls.tsx`

interface ProgressControlProps {
  progress: number;
  progressMessage: string;
  onRefresh: () => void;
  onCancel: () => void;
  isRunning: boolean;
  shouldRerunAnalysis: boolean;
}

export function ProgressControls({
  progress,
  progressMessage,
  onRefresh,
  onCancel,
  isRunning,
  shouldRerunAnalysis,
}: ProgressControlProps) {
  const { euiTheme } = useEuiTheme();
  const runningProgressBarStyles = useAnimatedProgressBarBackground(euiTheme.colors.success);

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
          <EuiFlexItem css={isRunning ? runningProgressBarStyles : undefined}>
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
          <EuiButton
            data-test-subj={`aiopsRerunAnalysisButton${shouldRerunAnalysis ? ' shouldRerun' : ''}`}
            size="s"
            onClick={onRefresh}
            color={shouldRerunAnalysis ? 'warning' : 'primary'}
          >
            <EuiFlexGroup>
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.aiops.rerunAnalysisButtonTitle"
                  defaultMessage="Rerun analysis"
                />
              </EuiFlexItem>
              {shouldRerunAnalysis && (
                <>
                  <EuiFlexItem>
                    <EuiIconTip
                      aria-label="Warning"
                      type="alert"
                      color="warning"
                      content={i18n.translate('xpack.aiops.rerunAnalysisTooltipContent', {
                        defaultMessage:
                          'Analysis data may be out of date due to selection update. Rerun analysis.',
                      })}
                    />
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiButton>
        )}
        {isRunning && (
          <EuiButton data-test-subj="aiopsCancelAnalysisButton" size="s" onClick={onCancel}>
            <FormattedMessage id="xpack.aiops.cancelAnalysisButtonTitle" defaultMessage="Cancel" />
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
