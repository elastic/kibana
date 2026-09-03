/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiEmptyPrompt,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { Improvement } from '../../../../common/http_api/improvements';
import type { SignalGroup } from '../../../../common/http_api/signals';
import { useDecideImprovement } from '../../hooks/use_decide_improvement';
import { useFeedbackLoopEnabled } from '../../hooks/use_feedback_loop_enabled';
import { useImprovements } from '../../hooks/use_improvements';
import { useKibana } from '../../hooks/use_kibana';
import { analyzeAndImprove } from '../../utils/analyze_and_improve';
import { FeedbackAnalysisConfig } from './feedback_analysis_config';
import { FeedbackRunStatus } from './feedback_run_status';
import { ImprovementRow } from './improvement_row';
import { SignalGroupFlyout } from './signal_group_flyout';

interface ImprovementsPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
}

/**
 * The improvements a feedback analysis run proposed, and the decisions on them.
 *
 * Nothing here changes the AI index until a reviewer approves: the panel is a read-only view of
 * what the loop suggested, with an explicit action to accept it. Applied and rejected suggestions
 * collapse into history, while failed ones stay in the open list — an apply that errored wrote
 * nothing, so it is still awaiting a decision.
 */
export const ImprovementsPanel = ({ isLoading, aiIndex }: ImprovementsPanelProps) => {
  const {
    services: { getChatOpener },
  } = useKibana();
  // Resolved at render time rather than captured once at mount.
  const chatOpener = getChatOpener?.();

  const feedbackLoopEnabled = useFeedbackLoopEnabled();
  const aiIndexId = aiIndex?.id;

  const {
    improvements: open,
    isLoading: isLoadingOpen,
    error,
  } = useImprovements({ aiIndexId, enabled: feedbackLoopEnabled });

  const { improvements: history, isLoading: isLoadingHistory } = useImprovements({
    aiIndexId,
    status: ['applied', 'rejected'],
    enabled: feedbackLoopEnabled,
  });

  const { approve, reject, approvingId, rejectingId } = useDecideImprovement(aiIndexId ?? '');
  const [provenanceGroup, setProvenanceGroup] = useState<SignalGroup | undefined>();

  const loading = isLoading || isLoadingOpen;
  const isAnalysisEnabled = aiIndex?.feedback_analysis?.enabled ?? false;

  const handleTalkWithAgent = (improvement: Improvement) => {
    if (aiIndex) {
      analyzeAndImprove(getChatOpener, { aiIndex, improvement });
    }
  };

  const handleOpenRunConversation = (conversationId: string) => {
    if (aiIndex) {
      analyzeAndImprove(getChatOpener, { aiIndex, conversationId });
    }
  };

  // The signals view is grouped by tag, so provenance drills to the tag that drove the suggestion.
  const handleViewProvenance = (improvement: Improvement) => {
    const [tag] = improvement.provenance.tags ?? [];
    if (tag) {
      setProvenanceGroup({ tag, count: improvement.provenance.signal_count ?? 0 });
    }
  };

  // Feedback loop off → the whole feature is inert; render nothing rather than an empty panel.
  if (!feedbackLoopEnabled) {
    return null;
  }

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextImprovementsPanel">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.title', {
            defaultMessage: 'Improvements',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.description', {
            defaultMessage:
              'Changes the analysis suggested from this index’s signals. Nothing is applied until you approve it.',
          })}
        </p>
      </EuiText>

      {aiIndex && (
        <>
          <EuiSpacer size="m" />
          <FeedbackAnalysisConfig aiIndex={aiIndex} showAgentSelector={Boolean(chatOpener)} />
          <EuiSpacer size="s" />
          <FeedbackRunStatus
            run={aiIndex.feedback_run}
            onOpenConversation={chatOpener ? handleOpenRunConversation : undefined}
          />
        </>
      )}

      <EuiSpacer size="m" />

      {loading ? (
        <EuiSkeletonText lines={3} data-test-subj="contextImprovementsLoading" />
      ) : error ? (
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
          titleSize="xs"
          data-test-subj="contextImprovementsError"
          title={
            <h3>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.errorTitle', {
                defaultMessage: 'Unable to load improvements',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.errorBody', {
                defaultMessage:
                  'Check that you have read access to the improvements index, then try again.',
              })}
            </p>
          }
        />
      ) : open.length === 0 ? (
        <EuiEmptyPrompt
          iconType="checkInCircleFilled"
          titleSize="xs"
          data-test-subj="contextImprovementsEmpty"
          title={
            <h3>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.emptyTitle', {
                defaultMessage: 'Nothing to review',
              })}
            </h3>
          }
          body={
            <p>
              {isAnalysisEnabled
                ? i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.improvements.emptyBodyEnabled',
                    {
                      defaultMessage:
                        'Suggestions appear here after an analysis run finds something worth changing.',
                    }
                  )
                : i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.improvements.emptyBodyDisabled',
                    {
                      defaultMessage:
                        'Turn on scheduled analysis above to have this index’s signals reviewed for improvements.',
                    }
                  )}
            </p>
          }
        />
      ) : (
        <div data-test-subj="contextImprovementsOpen" role="list">
          {open.map((improvement, index) => (
            <React.Fragment key={improvement.improvement_id}>
              <ImprovementRow
                improvement={improvement}
                onApprove={({ improvement_id: id }) => approve({ improvementId: id })}
                onReject={({ improvement_id: id }) => reject({ improvementId: id })}
                isApproving={approvingId === improvement.improvement_id}
                isRejecting={rejectingId === improvement.improvement_id}
                canDecide={aiIndex !== undefined}
                onTalkWithAgent={chatOpener ? handleTalkWithAgent : undefined}
                onViewProvenance={handleViewProvenance}
              />
              {index < open.length - 1 && <EuiSpacer size="s" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {!isLoadingHistory && history.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="contextImprovementsHistory"
            data-test-subj="contextImprovementsHistory"
            buttonContent={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.improvements.historyTitle',
              {
                defaultMessage:
                  '{count, plural, one {# decided improvement} other {# decided improvements}}',
                values: { count: history.length },
              }
            )}
          >
            <EuiSpacer size="s" />
            <div role="list">
              {history.map((improvement, index) => (
                <React.Fragment key={improvement.improvement_id}>
                  <ImprovementRow
                    improvement={improvement}
                    onApprove={() => {}}
                    onReject={() => {}}
                    isApproving={false}
                    isRejecting={false}
                    canDecide={false}
                    onViewProvenance={handleViewProvenance}
                  />
                  {index < history.length - 1 && <EuiSpacer size="s" />}
                </React.Fragment>
              ))}
            </div>
          </EuiAccordion>
        </>
      )}

      {provenanceGroup && (
        <SignalGroupFlyout
          group={provenanceGroup}
          aiIndex={aiIndex}
          onClose={() => setProvenanceGroup(undefined)}
        />
      )}
    </EuiPanel>
  );
};
