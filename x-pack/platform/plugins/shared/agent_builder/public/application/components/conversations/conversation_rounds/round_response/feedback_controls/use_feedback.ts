/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import type {
  Conversation,
  ConversationRoundFeedback,
  FeedbackChipId,
} from '@kbn/agent-builder-common';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { useConversationId } from '../../../../../context/conversation/use_conversation_id';
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

export interface FeedbackState {
  vote: Vote;
  chips: FeedbackChipId[];
  comment: string;
  modalOpen: boolean;
  inviteVisible: boolean;
  submitted: boolean;
  submittedFading: boolean;
  isSubmitting: boolean;
}

export interface UseFeedbackReturn extends FeedbackState {
  setVote: (vote: 'up' | 'down') => void;
  toggleChip: (chip: FeedbackChipId) => void;
  setComment: (value: string) => void;
  openModal: () => void;
  closeModal: () => void;
  dismissInvite: () => void;
  submit: () => void;
}

export interface FeedbackEbtContext {
  traceId?: string;
  connectorId?: string;
  model?: string;
  agentId?: string;
  toolNames?: string[];
  inputTokens?: number;
  outputTokens?: number;
  llmCalls?: number;
}

const SUBMITTED_VISIBLE_MS = 2500;
const SUBMITTED_FADE_MS = 500;

export const useFeedback = (
  roundId: string,
  initialFeedback?: { vote: 'up' | 'down' },
  ebtContext?: FeedbackEbtContext
): UseFeedbackReturn => {
  const conversationId = useConversationId();
  const { conversationsService } = useAgentBuilderServices();
  const { services } = useKibana();
  const { addErrorToast } = useToasts();
  const queryClient = useQueryClient();
  const serverVote = initialFeedback?.vote ?? null;
  const [vote, setVoteState] = useState<Vote>(serverVote);
  const [chips, setChips] = useState<FeedbackChipId[]>([]);
  const [comment, setComment] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [submittedPhase, setSubmittedPhase] = useState<SubmittedPhase>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const patchCache = useCallback(
    (feedback: ConversationRoundFeedback | undefined) => {
      if (!conversationId) return;
      const key = queryKeys.conversations.byId(conversationId);
      queryClient.setQueryData<Conversation>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          rounds: old.rounds.map((r) => (r.id === roundId ? { ...r, feedback } : r)),
        };
      });
      queryClient.invalidateQueries({ queryKey: key });
    },
    [conversationId, queryClient, roundId]
  );

  const setVote = useCallback(
    (next: 'up' | 'down') => {
      if (isSubmittingRef.current) return;

      const prev = voteRef.current;

      if (prev === next) {
        resetTo();
        if (conversationId) {
          isSubmittingRef.current = true;
          setIsSubmitting(true);
          conversationsService
            .submitRoundFeedback({ conversationId, roundId, vote: null })
            .then(() => {
              patchCache(undefined);
              services.analytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.FeedbackRetracted, {
                round_id: roundId,
                conversation_id: conversationId,
                trace_id: ebtContext?.traceId,
                connector_id: ebtContext?.connectorId,
                model: ebtContext?.model,
                agent_id: ebtContext?.agentId,
                tool_names: ebtContext?.toolNames,
                input_tokens: ebtContext?.inputTokens,
                output_tokens: ebtContext?.outputTokens,
                llm_calls: ebtContext?.llmCalls,
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
        }
        return;
      }

      clearSubmittedTimers();
      setChips([]);
      setComment('');
      setSubmittedPhase('idle');

      if (next === 'down') {
        setVoteState('down');
        setModalOpen(true);
        setInviteVisible(false);
        if (conversationId) {
          isSubmittingRef.current = true;
          setIsSubmitting(true);
          conversationsService
            .submitRoundFeedback({ conversationId, roundId, vote: 'down' })
            .then(() => {
              patchCache({
                vote: 'down',
                chips: [],
                comment: '',
                submitted_at: new Date().toISOString(),
              });
              services.analytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.FeedbackSubmitted, {
                round_id: roundId,
                conversation_id: conversationId,
                vote: 'down',
                chips: [],
                trace_id: ebtContext?.traceId,
                connector_id: ebtContext?.connectorId,
                model: ebtContext?.model,
                agent_id: ebtContext?.agentId,
                tool_names: ebtContext?.toolNames,
                input_tokens: ebtContext?.inputTokens,
                output_tokens: ebtContext?.outputTokens,
                llm_calls: ebtContext?.llmCalls,
              });
            })
            .catch(() => {
              addErrorToast({ title: labels.voteError });
              resetTo(prev);
            })
            .finally(() => {
              isSubmittingRef.current = false;
              setIsSubmitting(false);
            });
        }
      } else {
        setVoteState('up');
        setModalOpen(false);
        setInviteVisible(true);
        if (conversationId) {
          isSubmittingRef.current = true;
          setIsSubmitting(true);
          conversationsService
            .submitRoundFeedback({ conversationId, roundId, vote: 'up' })
            .then(() => {
              patchCache({
                vote: 'up',
                chips: [],
                comment: '',
                submitted_at: new Date().toISOString(),
              });
              services.analytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.FeedbackSubmitted, {
                round_id: roundId,
                conversation_id: conversationId,
                vote: 'up',
                chips: [],
                trace_id: ebtContext?.traceId,
                connector_id: ebtContext?.connectorId,
                model: ebtContext?.model,
                agent_id: ebtContext?.agentId,
                tool_names: ebtContext?.toolNames,
                input_tokens: ebtContext?.inputTokens,
                output_tokens: ebtContext?.outputTokens,
                llm_calls: ebtContext?.llmCalls,
              });
            })
            .catch(() => {
              addErrorToast({ title: labels.voteError });
              setVoteState(prev);
              setInviteVisible(false);
            })
            .finally(() => {
              isSubmittingRef.current = false;
              setIsSubmitting(false);
            });
        }
      }
    },
    [
      conversationId,
      conversationsService,
      roundId,
      resetTo,
      clearSubmittedTimers,
      patchCache,
      addErrorToast,
      ebtContext,
      services.analytics,
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
    if (!currentVote || !conversationId || isSubmittingRef.current || isSubmitInFlightRef.current)
      return;

    setModalOpen(false);
    isSubmitInFlightRef.current = true;
    setIsSubmitting(true);

    conversationsService
      .submitRoundFeedback({
        conversationId,
        roundId,
        vote: currentVote,
        chips,
        comment,
      })
      .then(() => {
        patchCache({
          vote: currentVote,
          chips,
          comment,
          submitted_at: new Date().toISOString(),
        });

        services.analytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.FeedbackSubmitted, {
          round_id: roundId,
          conversation_id: conversationId,
          vote: currentVote,
          chips: chips as string[],
          ...(comment.trim().length > 0 ? { comment: comment.trim() } : {}),
          trace_id: ebtContext?.traceId,
          connector_id: ebtContext?.connectorId,
          model: ebtContext?.model,
          agent_id: ebtContext?.agentId,
          tool_names: ebtContext?.toolNames,
          input_tokens: ebtContext?.inputTokens,
          output_tokens: ebtContext?.outputTokens,
          llm_calls: ebtContext?.llmCalls,
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
        resetTo();
      })
      .finally(() => {
        isSubmitInFlightRef.current = false;
        setIsSubmitting(false);
      });
  }, [
    conversationId,
    conversationsService,
    roundId,
    chips,
    comment,
    ebtContext,
    services.analytics,
    clearSubmittedTimers,
    addErrorToast,
    resetTo,
    patchCache,
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
