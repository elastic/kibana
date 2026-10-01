/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import type { FeedbackChipId } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useToasts } from '../../../../../hooks/use_toasts';
import { queryKeys } from '../../../../../query_keys';

const labels = {
  submitError: i18n.translate('xpack.agentBuilder.feedbackControls.submitError', {
    defaultMessage: 'Failed to save feedback, please try again',
  }),
  voteError: i18n.translate('xpack.agentBuilder.feedbackControls.voteError', {
    defaultMessage: 'Failed to save vote, please try again',
  }),
  retractError: i18n.translate('xpack.agentBuilder.feedbackControls.retractError', {
    defaultMessage: 'Failed to remove vote, please try again',
  }),
};

type Vote = 'up' | 'down' | null;
type SubmittedPhase = 'idle' | 'visible' | 'fading';

interface FeedbackState {
  vote: Vote;
  chips: FeedbackChipId[];
  comment: string;
  modalOpen: boolean;
  inviteVisible: boolean;
  submitted: boolean;
  submittedFading: boolean;
  isSubmitting: boolean;
}

interface UseFeedbackReturn extends FeedbackState {
  setVote: (vote: 'up' | 'down') => void;
  toggleChip: (chip: FeedbackChipId) => void;
  setComment: (value: string) => void;
  openModal: () => void;
  closeModal: () => void;
  dismissInvite: () => void;
  submit: () => void;
}

interface FeedbackEbtContext {
  connectorId?: string;
  model?: string;
  agentId?: string;
  inputTokens?: number;
  outputTokens?: number;
  llmCalls?: number;
}

const SUBMITTED_VISIBLE_MS = 2500;
const SUBMITTED_FADE_MS = 500;

const makeEbtPayload = (ctx: FeedbackEbtContext | undefined) => ({
  connector_id: ctx?.connectorId,
  model: ctx?.model,
  agent_id: ctx?.agentId,
  input_tokens: ctx?.inputTokens,
  output_tokens: ctx?.outputTokens,
  llm_calls: ctx?.llmCalls,
});

export const useFeedback = (
  conversationId: string,
  executionId: string,
  /** The current persisted vote, derived from the conversation feedback map. */
  serverVote: Vote,
  ebtContext?: FeedbackEbtContext
): UseFeedbackReturn => {
  const { conversationsService } = useAgentBuilderServices();
  const { services } = useKibana();
  const { addErrorToast } = useToasts();
  const queryClient = useQueryClient();

  const [vote, setVoteState] = useState<Vote>(serverVote);
  const [chips, setChips] = useState<FeedbackChipId[]>([]);
  const [comment, setComment] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [submittedPhase, setSubmittedPhase] = useState<SubmittedPhase>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setVoteState(serverVote);
  }, [serverVote]);

  const isSubmittingRef = useRef(false);
  const isSubmitInFlightRef = useRef(false);
  const voteRef = useRef(vote);
  const timer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  voteRef.current = vote;
  isSubmittingRef.current = isSubmitting;

  const clearSubmittedTimers = useCallback(() => {
    if (timer1Ref.current) clearTimeout(timer1Ref.current);
    if (timer2Ref.current) clearTimeout(timer2Ref.current);
  }, []);

  useEffect(() => clearSubmittedTimers, [clearSubmittedTimers]);

  const invalidateConversation = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
  }, [conversationId, queryClient]);

  const resetTo = useCallback(
    (initialVote: Vote = null) => {
      clearSubmittedTimers();
      setVoteState(initialVote);
      setChips([]);
      setComment('');
      setModalOpen(false);
      setInviteVisible(false);
      setSubmittedPhase('idle');
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      isSubmitInFlightRef.current = false;
    },
    [clearSubmittedTimers]
  );

  const setVote = useCallback(
    (next: 'up' | 'down') => {
      if (isSubmittingRef.current) return;

      const prev = voteRef.current;

      if (prev === next) {
        resetTo();
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        conversationsService
          .submitRoundFeedback({ conversationId, executionId, vote: null })
          .then(() => {
            invalidateConversation();
            services.analytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.FeedbackRetracted, {
              round_id: executionId,
              conversation_id: conversationId,
              ...makeEbtPayload(ebtContext),
            });
          })
          .catch(() => {
            addErrorToast({ title: labels.retractError });
            setVoteState(prev);
          })
          .finally(() => {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          });
        return;
      }

      clearSubmittedTimers();
      setChips([]);
      setComment('');
      setSubmittedPhase('idle');

      setVoteState(next);
      setModalOpen(next === 'down');
      setInviteVisible(next === 'up');
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      conversationsService
        .submitRoundFeedback({ conversationId, executionId, vote: next })
        .then(() => {
          invalidateConversation();
        })
        .catch(() => {
          addErrorToast({ title: labels.voteError });
          resetTo(prev);
        })
        .finally(() => {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        });
    },
    [
      conversationId,
      conversationsService,
      executionId,
      resetTo,
      clearSubmittedTimers,
      invalidateConversation,
      addErrorToast,
    ]
  );

  const toggleChip = useCallback((chip: FeedbackChipId) => {
    setChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));
  }, []);

  const openModal = useCallback(() => {
    setModalOpen(true);
    setInviteVisible(false);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const dismissInvite = useCallback(() => setInviteVisible(false), []);

  const submit = useCallback(() => {
    const currentVote = voteRef.current;
    if (!currentVote || isSubmittingRef.current || isSubmitInFlightRef.current) return;

    setModalOpen(false);
    isSubmitInFlightRef.current = true;
    setIsSubmitting(true);

    conversationsService
      .submitRoundFeedback({ conversationId, executionId, vote: currentVote, chips, comment })
      .then(() => {
        invalidateConversation();
        services.analytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.FeedbackSubmitted, {
          round_id: executionId,
          conversation_id: conversationId,
          vote: currentVote,
          chips: chips as string[],
          ...(comment.trim().length > 0 ? { comment: comment.trim() } : {}),
          ...makeEbtPayload(ebtContext),
        });

        setSubmittedPhase('visible');
        clearSubmittedTimers();
        timer1Ref.current = setTimeout(() => {
          setSubmittedPhase('fading');
          timer2Ref.current = setTimeout(() => {
            setSubmittedPhase('idle');
          }, SUBMITTED_FADE_MS);
        }, SUBMITTED_VISIBLE_MS);
      })
      .catch(() => {
        addErrorToast({ title: labels.submitError });
        setModalOpen(true);
      })
      .finally(() => {
        isSubmitInFlightRef.current = false;
        setIsSubmitting(false);
      });
  }, [
    conversationId,
    conversationsService,
    executionId,
    chips,
    comment,
    ebtContext,
    services.analytics,
    clearSubmittedTimers,
    addErrorToast,
    invalidateConversation,
  ]);

  return {
    vote,
    chips,
    comment,
    modalOpen,
    inviteVisible,
    submitted: submittedPhase !== 'idle',
    submittedFading: submittedPhase === 'fading',
    isSubmitting,
    setVote,
    toggleChip,
    setComment,
    openModal,
    closeModal,
    dismissInvite,
    submit,
  };
};
