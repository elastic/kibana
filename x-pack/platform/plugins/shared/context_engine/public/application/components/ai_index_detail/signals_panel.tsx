/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
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
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { SignalGroup } from '../../../../common/http_api/signals';
import { analyzeAndImprove } from '../../utils/analyze_and_improve';
import { useFeedbackLoopEnabled } from '../../hooks/use_feedback_loop_enabled';
import { useFeedbackSchedule } from '../../hooks/use_feedback_schedule';
import { useKibana } from '../../hooks/use_kibana';
import { useRunFeedbackLoop } from '../../hooks/use_run_feedback_loop';
import { useSignalGroups } from '../../hooks/use_signal_groups';
import { FeedbackAgentSelector } from './feedback_agent_selector';
import { SignalGroupFlyout } from './signal_group_flyout';
import { SignalGroupRow } from './signal_group_row';
import { SignalsErrorPrompt } from './signals_error_prompt';

interface SignalsPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
}

/**
 * Read-only Signals panel. Shows a preaggregated grouped-by-tag list of "issue" cards; clicking a
 * group opens a flyout with its member signals (each drilling into a trace waterfall).
 *
 * It also carries the analysis controls: "Run now" starts one autonomous run whose suggestions land
 * in the improvements panel, the schedule switch makes that recurring, and "Analyze & improve" hands
 * the same briefing to Agent Builder chat for a conversation instead.
 */
export const SignalsPanel = ({ isLoading, aiIndex }: SignalsPanelProps) => {
  const {
    services: { getChatOpener },
  } = useKibana();
  // Resolved at render time rather than captured once at mount.
  const chatOpener = getChatOpener?.();

  // Signals (generation + this panel) are gated on the global feedback-loop setting. Without this
  // the panel would render a permanently-empty "No signals yet" surface whenever the loop is off.
  const feedbackLoopEnabled = useFeedbackLoopEnabled();
  const {
    groups,
    isLoading: isLoadingGroups,
    error: groupsError,
  } = useSignalGroups({
    enabled: feedbackLoopEnabled,
  });
  const [selectedGroup, setSelectedGroup] = useState<SignalGroup | undefined>();

  const aiIndexId = aiIndex?.id;
  const runFeedbackLoop = useRunFeedbackLoop(aiIndexId ?? '');
  const schedule = useFeedbackSchedule({ aiIndexId, enabled: feedbackLoopEnabled });

  const loading = isLoading || isLoadingGroups;

  const handleAnalyze = () => {
    if (aiIndex) {
      analyzeAndImprove(getChatOpener, { aiIndex, tag: undefined });
    }
  };

  // Feedback loop off → the whole feature is inert; render nothing rather than an empty panel.
  if (!feedbackLoopEnabled) {
    return null;
  }

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextSignalsPanel">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.title', {
                defaultMessage: 'Signals',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="play"
            onClick={() => runFeedbackLoop.mutate()}
            isDisabled={aiIndex === undefined}
            isLoading={runFeedbackLoop.isLoading}
            data-test-subj="contextSignalsRunNowButton"
          >
            {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.runNowButton', {
              defaultMessage: 'Run now',
            })}
          </EuiButton>
        </EuiFlexItem>
        {chatOpener && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="sparkles"
              onClick={handleAnalyze}
              isDisabled={aiIndex === undefined}
              data-test-subj="contextSignalsAnalyzeButton"
            >
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.analyzeButton', {
                defaultMessage: 'Analyze & improve',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false} wrap>
        {aiIndex && !aiIndex.managed && (
          <EuiFlexItem grow={false}>
            <FeedbackAgentSelector aiIndex={aiIndex} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.contextEngine.aiIndexDetail.signals.scheduleSwitch', {
              defaultMessage: 'Analyze automatically every day',
            })}
            checked={schedule.isEnabled}
            disabled={aiIndex === undefined || schedule.isLoading || schedule.isSaving}
            onChange={(event) => schedule.setEnabled(event.target.checked)}
            data-test-subj="contextSignalsScheduleSwitch"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued" data-test-subj="contextSignalsAnalysisHint">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.analysisHint', {
            defaultMessage:
              'Runs analyze the signals below and propose changes for you to review. Scheduled runs use your privileges. Without an analysis agent, the built-in Context Engine Feedback Loop agent is used.',
          })}
        </p>
      </EuiText>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.description', {
            defaultMessage:
              'Signals are observations classified from Agent Builder traces, grouped by tag. Open a group to inspect individual signals and their traces.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {loading ? (
        <EuiSkeletonText lines={3} data-test-subj="contextSignalsLoading" />
      ) : groupsError ? (
        <SignalsErrorPrompt />
      ) : groups.length === 0 ? (
        <EuiEmptyPrompt
          iconType="inspect"
          titleSize="xs"
          data-test-subj="contextSignalsEmpty"
          title={
            <h3>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.emptyTitle', {
                defaultMessage: 'No signals yet',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.emptyBody', {
                defaultMessage:
                  'Signals appear here once Agent Builder traces have been processed.',
              })}
            </p>
          }
        />
      ) : (
        <div data-test-subj="contextSignalsGroups" role="list">
          {groups.map((group, groupIndex) => (
            <React.Fragment key={group.tag}>
              <SignalGroupRow group={group} onView={() => setSelectedGroup(group)} />
              {groupIndex < groups.length - 1 && <EuiSpacer size="s" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {selectedGroup && (
        <SignalGroupFlyout
          group={selectedGroup}
          aiIndex={aiIndex}
          onClose={() => setSelectedGroup(undefined)}
        />
      )}
    </EuiPanel>
  );
};
