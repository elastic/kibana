/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiHorizontalRule, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { ImprovementAction } from '../../../../common/http_api/improvement_actions';
import type { Improvement } from '../../../../common/http_api/improvements';
import { useFeedbackLoopEnabled } from '../../hooks/use_feedback_loop_enabled';
import { useDecideImprovement } from '../../hooks/use_decide_improvement';
import { useKibana } from '../../hooks/use_kibana';
import {
  useScopedImprovements,
  useScopedImprovementsHistory,
} from '../../hooks/use_scoped_improvements';
import { analyzeAndImprove } from '../../utils/analyze_and_improve';
import { ImprovementRow } from './improvement_row';
import { RejectImprovementModal } from './reject_improvement_modal';

interface ScopedImprovementsProps {
  aiIndex: GetAiIndexResponse | undefined;
  /** The actions this panel is responsible for, which is what makes it their home. */
  actions: readonly ImprovementAction[];
  'data-test-subj': string;
}

/**
 * The open suggestions that would change this panel's part of the AI index.
 *
 * Suggestions are shown where the change would land rather than in a queue of their own: a
 * proposal to add a source is about the sources, and a reviewer weighing it wants to see what is
 * already configured next to it. Deciding is the only thing that changes the index — until then
 * this is a read-only view of what the analysis proposed.
 *
 * Renders nothing when there is nothing to review, so a panel with no suggestions looks exactly as
 * it did before.
 */
export const ScopedImprovements = ({
  aiIndex,
  actions,
  'data-test-subj': dataTestSubj,
}: ScopedImprovementsProps) => {
  const {
    services: { getChatOpener },
  } = useKibana();
  // Resolved at render time rather than captured once at mount.
  const chatOpener = getChatOpener?.();

  const aiIndexId = aiIndex?.id;
  const feedbackLoopEnabled = useFeedbackLoopEnabled();

  const scoped = useScopedImprovements({ aiIndexId, actions });
  const { approve, reject, approvingId, rejectingId } = useDecideImprovement(aiIndexId ?? '');
  const [rejecting, setRejecting] = useState<Improvement | undefined>();
  const { history } = useScopedImprovementsHistory({
    aiIndexId,
    actions,
    enabled: feedbackLoopEnabled,
  });

  const handleTalkWithAgent = (improvement: Improvement) => {
    if (aiIndex) {
      analyzeAndImprove(getChatOpener, { aiIndex, improvement });
    }
  };

  const handleConfirmReject = (reason: string | undefined) => {
    if (rejecting) {
      reject({ improvementId: rejecting.improvement_id, ...(reason ? { reason } : {}) });
      setRejecting(undefined);
    }
  };

  if (scoped.length === 0 && history.length === 0) {
    return null;
  }

  return (
    <div data-test-subj={dataTestSubj}>
      {scoped.length > 0 && (
        <>
          <EuiHorizontalRule margin="m" />

          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.scopedImprovements.title', {
                defaultMessage:
                  '{count, plural, one {# suggested change} other {# suggested changes}} — nothing is applied until you approve it',
                values: { count: scoped.length },
              })}
            </strong>
          </EuiText>

          <EuiSpacer size="s" />

          <div role="list">
            {scoped.map((improvement, index) => (
              <React.Fragment key={improvement.improvement_id}>
                <ImprovementRow
                  improvement={improvement}
                  onApprove={({ improvement_id: id }) => approve({ improvementId: id })}
                  onReject={setRejecting}
                  isApproving={approvingId === improvement.improvement_id}
                  isRejecting={rejectingId === improvement.improvement_id}
                  canDecide={aiIndex !== undefined}
                  onTalkWithAgent={chatOpener ? handleTalkWithAgent : undefined}
                />
                {index < scoped.length - 1 && <EuiSpacer size="s" />}
              </React.Fragment>
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiAccordion
            id={`${dataTestSubj}-history`}
            buttonContent={
              <EuiText size="xs" color="subdued">
                <strong>
                  {i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.scopedImprovements.historyToggle',
                    { defaultMessage: 'Past decisions' }
                  )}
                </strong>
              </EuiText>
            }
            data-test-subj="contextImprovementsHistory"
          >
            <EuiSpacer size="s" />
            <div role="list">
              {history.map((improvement, index) => (
                <React.Fragment key={improvement.improvement_id}>
                  <ImprovementRow
                    improvement={improvement}
                    onApprove={({ improvement_id: id }) => approve({ improvementId: id })}
                    onReject={setRejecting}
                    isApproving={approvingId === improvement.improvement_id}
                    isRejecting={rejectingId === improvement.improvement_id}
                    canDecide={aiIndex !== undefined}
                  />
                  {index < history.length - 1 && <EuiSpacer size="s" />}
                </React.Fragment>
              ))}
            </div>
          </EuiAccordion>
        </>
      )}

      {rejecting && (
        <RejectImprovementModal
          improvement={rejecting}
          onCancel={() => setRejecting(undefined)}
          onConfirm={handleConfirmReject}
          isRejecting={rejectingId === rejecting.improvement_id}
        />
      )}
    </div>
  );
};
