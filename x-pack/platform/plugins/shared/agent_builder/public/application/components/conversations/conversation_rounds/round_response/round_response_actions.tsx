/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import copy from 'copy-to-clipboard';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  AGENT_BUILDER_UI_EBT,
  ConversationRoundStatus,
  isToolCallStep,
} from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useToasts } from '../../../../hooks/use_toasts';
import { useConversationStream } from '../../../../hooks/use_conversation_stream';
import { useAgentId, useConversationReadOnly } from '../../../../hooks/use_conversation';
import { useKibana } from '../../../../hooks/use_kibana';
import { useExperimentalFeatures } from '../../../../hooks/use_experimental_features';
import { useTracingEnabled } from '../../../../hooks/use_tracing_enabled';
import { RoundMetadataPopover } from './round_metadata_popover';
import { RoundTraceButton } from './round_trace_button';
import { useFeedback } from './feedback_controls/use_feedback';
import { ThumbButton } from './feedback_controls/thumb_button';
import { FeedbackModal } from './feedback_controls/feedback_modal';
import { UpInvite } from './feedback_controls/up_invite';
import { FeedbackSubmitted } from './feedback_controls/feedback_submitted';

const copyLabels = {
  response: {
    action: i18n.translate('xpack.agentBuilder.roundResponseActions.copy', {
      defaultMessage: 'Copy response',
    }),
    success: i18n.translate('xpack.agentBuilder.roundResponseActions.copySuccess', {
      defaultMessage: 'Response copied to clipboard',
    }),
  },
  prompt: {
    action: i18n.translate('xpack.agentBuilder.roundResponseActions.copyPrompt', {
      defaultMessage: 'Copy prompt',
    }),
    success: i18n.translate('xpack.agentBuilder.roundResponseActions.copyPromptSuccess', {
      defaultMessage: 'Prompt copied to clipboard',
    }),
  },
} as const;

const labels = {
  regenerate: i18n.translate('xpack.agentBuilder.roundResponseActions.regenerate', {
    defaultMessage: 'Regenerate response',
  }),
};

const ADD_TO_DATASET_METADATA_SOURCE = 'agent_builder';

// Round feedback is not modelled in the events timeline yet — it lives only on the
// round (`ConversationRoundFeedback`) and is dropped when rounds are projected from
// events, so a vote can't round-trip and a submitted vote would silently vanish on
// the next projection. Hide the control until feedback becomes a first-class
// timeline event. Typed `boolean` (not the `false` literal) so the gated render
// paths don't read as statically unreachable.
// TODO(agent-builder): re-enable once round feedback is captured as a timeline event.
const ROUND_FEEDBACK_ENABLED: boolean = false;

interface RoundResponseActionsProps {
  content: string;
  isVisible: boolean;
  isLastRound?: boolean;
  rawRound?: ConversationRound;
  /** Which side of the round `content` comes from, so the copy wording matches it. */
  copyTarget?: keyof typeof copyLabels;
}

export const RoundResponseActions: React.FC<RoundResponseActionsProps> = ({
  content,
  isVisible,
  isLastRound,
  rawRound,
  copyTarget = 'response',
}) => {
  const { addSuccessToast } = useToasts();
  const { regenerate, isRegenerating, isResponseLoading } = useConversationStream();
  const { services } = useKibana();
  const isExperimentalEnabled = useExperimentalFeatures();
  const isTracingEnabled = useTracingEnabled();
  const agentId = useAgentId();
  const { isReadOnly, isLoading: isConversationReadOnlyLoading } = useConversationReadOnly();

  const { action: copyLabel, success: copySuccessLabel } = copyLabels[copyTarget];

  const handleCopy = useCallback(() => {
    const isSuccess = copy(content);
    if (isSuccess) {
      addSuccessToast(copySuccessLabel);
    }
  }, [content, addSuccessToast, copySuccessLabel]);

  const handleResend = useCallback(() => {
    regenerate();
  }, [regenerate]);

  // Disable regenerate button while any response is loading
  const isRegenerateDisabled = isRegenerating || isResponseLoading;

  // Normalise trace_id — backend models it as `string | string[]` to keep the
  // door open for multi-trace rounds; only the first id is meaningful today.
  const traceId = useMemo(() => {
    const id = rawRound?.trace_id;
    if (!id) return undefined;
    return Array.isArray(id) ? id[0] : id;
  }, [rawRound?.trace_id]);

  const ebtContext = useMemo(
    () => ({
      traceId,
      connectorId: rawRound?.model_usage?.connector_id,
      model: rawRound?.model_usage?.model,
      agentId: agentId ?? undefined,
      toolNames: rawRound?.steps?.filter(isToolCallStep).map((s) => s.tool_id),
      inputTokens: rawRound?.model_usage?.input_tokens,
      outputTokens: rawRound?.model_usage?.output_tokens,
      llmCalls: rawRound?.model_usage?.llm_calls,
    }),
    [
      traceId,
      agentId,
      rawRound?.model_usage?.connector_id,
      rawRound?.model_usage?.model,
      rawRound?.model_usage?.input_tokens,
      rawRound?.model_usage?.output_tokens,
      rawRound?.model_usage?.llm_calls,
      rawRound?.steps,
    ]
  );

  const feedback = useFeedback(rawRound?.id ?? '', rawRound?.feedback, ebtContext);

  // `services.plugins.evals` is optional — the evals plugin isn't installed
  // in every Kibana deployment. When absent, the 'Add to Dataset' button hides.
  const addToDatasetAction = useMemo(() => {
    if (!rawRound || !services.plugins.evals?.getAddToDatasetAction) return null;
    return services.plugins.evals.getAddToDatasetAction({
      initialExample: {
        input: { round: rawRound },
        output: { steps: rawRound.steps },
        metadata: {
          source: ADD_TO_DATASET_METADATA_SOURCE,
          trace_id: traceId ?? null,
        },
      },
    });
  }, [rawRound, services.plugins.evals, traceId]);

  const showTraceButton = isTracingEnabled && Boolean(traceId);
  const showAddToDatasetButton = isExperimentalEnabled && addToDatasetAction !== null;
  const isEditable = !isReadOnly && !isConversationReadOnlyLoading;
  const showFeedback =
    ROUND_FEEDBACK_ENABLED &&
    Boolean(rawRound) &&
    rawRound?.status === ConversationRoundStatus.completed &&
    isEditable;
  const showRegenerateButton = isLastRound && isEditable;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          direction="row"
          justifyContent="flexStart"
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          css={css`
            opacity: ${isVisible ? 1 : 0};
            transition: opacity 0.2s ease;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiToolTip content={copyLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="copy"
                aria-label={copyLabel}
                onClick={handleCopy}
                color="text"
                data-test-subj="roundResponseCopyButton"
                {...getEbtProps({
                  element: AGENT_BUILDER_UI_EBT.element.pageContent,
                  action: AGENT_BUILDER_UI_EBT.action.conversation.COPY_RESPONSE,
                  detail: 'conversation',
                })}
              />
            </EuiToolTip>
          </EuiFlexItem>
          {showRegenerateButton && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={labels.regenerate} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="refresh"
                  aria-label={labels.regenerate}
                  onClick={handleResend}
                  color="text"
                  isDisabled={isRegenerateDisabled}
                  isLoading={isRegenerating}
                  data-test-subj="roundResponseRegenerateButton"
                  {...getEbtProps({
                    element: AGENT_BUILDER_UI_EBT.element.pageContent,
                    action: AGENT_BUILDER_UI_EBT.action.conversation.REGENERATE,
                    detail: 'conversation',
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
          {showTraceButton && traceId && (
            <EuiFlexItem grow={false}>
              <RoundTraceButton traceId={traceId} />
            </EuiFlexItem>
          )}
          {showAddToDatasetButton && addToDatasetAction && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType={addToDatasetAction.iconType}
                color="text"
                aria-label={addToDatasetAction.label}
                onClick={addToDatasetAction.onClick}
                data-test-subj="roundAddToDatasetButton"
                {...getEbtProps({
                  element: AGENT_BUILDER_UI_EBT.element.pageContent,
                  action: AGENT_BUILDER_UI_EBT.action.conversation.ROUND_ADD_TO_DATASET,
                  detail: 'conversation',
                })}
              />
            </EuiFlexItem>
          )}
          {rawRound && (
            <EuiFlexItem grow={false}>
              <RoundMetadataPopover rawRound={rawRound} />
            </EuiFlexItem>
          )}
          {showFeedback && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <ThumbButton
                    direction="up"
                    isActive={feedback.vote === 'up'}
                    isDisabled={feedback.isSubmitting}
                    onClick={() => feedback.setVote('up')}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ThumbButton
                    direction="down"
                    isActive={feedback.vote === 'down'}
                    isDisabled={feedback.isSubmitting}
                    onClick={() => feedback.setVote('down')}
                  />
                </EuiFlexItem>
                {(feedback.submitted || (feedback.vote === 'up' && feedback.inviteVisible)) && (
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      opacity: ${feedback.submittedFading ? 0 : 1};
                      transition: opacity ${feedback.submittedFading ? '0.5s' : '0s'} ease;
                    `}
                  >
                    {feedback.submitted ? (
                      <FeedbackSubmitted />
                    ) : (
                      <UpInvite
                        onTellUsMore={feedback.openModal}
                        onDismiss={feedback.dismissInvite}
                      />
                    )}
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {showFeedback && feedback.vote !== null && feedback.modalOpen && (
        <FeedbackModal
          vote={feedback.vote}
          chips={feedback.chips}
          comment={feedback.comment}
          isSubmitting={feedback.isSubmitting}
          onToggleChip={feedback.toggleChip}
          onCommentChange={feedback.setComment}
          onSubmit={feedback.submit}
          onClose={feedback.closeModal}
        />
      )}
    </EuiFlexGroup>
  );
};
