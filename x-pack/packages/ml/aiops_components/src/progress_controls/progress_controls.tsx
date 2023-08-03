/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import {
  useEuiTheme,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiProgress,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useAnimatedProgressBarBackground } from './use_animated_progress_bar_background';

// TODO Consolidate with duplicate component `CorrelationsProgressControls` in
// `x-pack/plugins/apm/public/components/app/correlations/progress_controls.tsx`

/**
 * Props for ProgressControlProps
 */
interface ProgressControlProps {
  isBrushCleared: boolean;
  progress: number;
  progressMessage: string;
  onRefresh: () => void;
  onCancel: () => void;
  onReset: () => void;
  isRunning: boolean;
  shouldRerunAnalysis: boolean;
  runAnalysisDisabled?: boolean;
}

/**
 * ProgressControls React Component
 * Component with ability to Run & cancel analysis
 * by default use `Baseline` and `Deviation` for the badge name
 * @type {FC<ProgressControlProps>}
 * @param children - List of Kibana services that are required as dependencies
 * @param brushSelectionUpdateHandler - Optional callback function which gets called when the brush selection has changed
 * @param width - Optional width
 * @param chartPoints - Data chart points
 * @param chartPointsSplit - Data chart points split
 * @param timeRangeEarliest - Start time range for the chart
 * @param timeRangeLatest - Ending time range for the chart
 * @param interval - Time interval for the document count buckets
 * @param chartPointsSplitLabel - Label to name the adjustedChartPointsSplit histogram
 * @param isBrushCleared - Whether or not brush has been reset
 * @param autoAnalysisStart - Timestamp for start of initial analysis
 * @param barColorOverride - Optional color override for the default bar color for charts
 * @param barStyleAccessor - Optional style to override bar chart
 * @param barHighlightColorOverride - Optional color override for the highlighted bar color for charts
 * @param deviationBrush - Optional settings override for the 'deviation' brush
 * @param baselineBrush - Optional settings override for the 'baseline' brush
 * @returns {React.ReactElement} The ProgressControls component.
 */
export const ProgressControls: FC<ProgressControlProps> = ({
  children,
  isBrushCleared,
  progress,
  progressMessage,
  onRefresh,
  onCancel,
  onReset,
  isRunning,
  shouldRerunAnalysis,
  runAnalysisDisabled = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const runningProgressBarStyles = useAnimatedProgressBarBackground(euiTheme.colors.success);
  const analysisCompleteStyle = { display: 'none' };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        {!isRunning && (
          <EuiButton
            disabled={runAnalysisDisabled}
            data-test-subj={`aiopsRerunAnalysisButton${shouldRerunAnalysis ? ' shouldRerun' : ''}`}
            size="s"
            onClick={onRefresh}
            color={shouldRerunAnalysis ? 'warning' : 'primary'}
          >
            <EuiFlexGroup>
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.aiops.rerunAnalysisButtonTitle"
                  defaultMessage="Run analysis"
                />
              </EuiFlexItem>
              {shouldRerunAnalysis && (
                <>
                  <EuiFlexItem>
                    <EuiIconTip
                      aria-label="Warning"
                      type="warning"
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
      {(progress === 1 || isRunning === false) && !isBrushCleared ? (
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="aiopsClearSelectionBadge"
            size="s"
            onClick={onReset}
            color="text"
          >
            <FormattedMessage id="xpack.aiops.resetLabel" defaultMessage="Reset" />
          </EuiButton>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem>
        {progress === 1 ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="checkInCircleFilled" color={euiTheme.colors.success} />
            </EuiFlexItem>
            <EuiFlexItem grow={false} data-test-subj="aiopsAnalysisComplete">
              <small>
                {i18n.translate('xpack.aiops.analysisCompleteLabel', {
                  defaultMessage: 'Analysis complete',
                })}
              </small>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          css={progress === 1 ? analysisCompleteStyle : undefined}
        >
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
      {children}
    </EuiFlexGroup>
  );
};
