/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useFeedbackLoopEnabled } from '../../hooks/use_feedback_loop_enabled';
import { useRunFeedbackAnalysis } from '../../hooks/use_run_feedback_analysis';
import { useUpdateFeedbackAnalysis } from '../../hooks/use_update_feedback_analysis';

interface TracesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
}

const AutoImproveControl = ({ aiIndex }: { aiIndex: GetAiIndexResponse }) => {
  const updateConfig = useUpdateFeedbackAnalysis(aiIndex);
  const runAnalysis = useRunFeedbackAnalysis(aiIndex.id);
  const isAnalysisEnabled = aiIndex.feedback_analysis?.enabled ?? false;

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiSwitch
            checked={isAnalysisEnabled}
            disabled={updateConfig.isLoading}
            onChange={(event) => updateConfig.mutate({ enabled: event.target.checked })}
            label={i18n.translate('xpack.contextEngine.aiIndexDetail.traces.autoImproveLabel', {
              defaultMessage: 'Suggest improvements automatically',
            })}
            data-test-subj="contextTracesAutoImproveSwitch"
          />
        </EuiFlexItem>

        {isAnalysisEnabled && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="play"
              onClick={() => runAnalysis.mutate()}
              isLoading={runAnalysis.isLoading}
              data-test-subj="contextImprovementsRunNowButton"
            >
              {i18n.translate('xpack.contextEngine.aiIndexDetail.traces.runNowButton', {
                defaultMessage: 'Run now',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.traces.autoImproveHelp', {
            defaultMessage:
              'Reviews recent queries on a schedule and proposes changes in the panels above. Suggestions are never applied on their own.',
          })}
        </p>
      </EuiText>
    </>
  );
};

export const TracesPanel = ({ isLoading, aiIndex }: TracesPanelProps) => {
  const feedbackLoopEnabled = useFeedbackLoopEnabled();

  if (!feedbackLoopEnabled) {
    return null;
  }

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextTracesPanel">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.traces.title', {
            defaultMessage: 'Feedback loop',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      {isLoading ? (
        <EuiSkeletonText lines={2} data-test-subj="contextTracesLoading" />
      ) : aiIndex ? (
        <AutoImproveControl aiIndex={aiIndex} />
      ) : null}
    </EuiPanel>
  );
};
