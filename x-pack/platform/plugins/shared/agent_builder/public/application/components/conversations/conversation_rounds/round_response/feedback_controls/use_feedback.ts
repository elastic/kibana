/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { useConversationId } from '../../../../../context/conversation/use_conversation_id';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { useToasts } from '../../../../../hooks/use_toasts';
import { queryKeys } from '../../../../../query_keys';

const labels = {
  submitError: i18n.translate('xpack.agentBuilder.feedbackControls.submitError', {
    defaultMessage: 'Failed to save feedback, please try again',
  }),
};

type Vote = 'up' | 'down' | null;

export interface FeedbackState {
  vote: Vote;
  chips: string[];
  comment: string;
  modalOpen: boolean;
  inviteVisible: boolean;
  submitted: boolean;
  submittedFading: boolean;
}

export interface UseFeedbackReturn extends FeedbackState {
  setVote: (vote: 'up' | 'down') => void;
  toggleChip: (chip: string) => void;
  setComment: (value: string) => void;
  openModal: () => void;
  closeModal: () => void;
  dismissInvite: () => void;
  submit: () => void;
}

const SUBMITTED_VISIBLE_MS = 2500;
const SUBMITTED_FADE_MS = 500;

export const useFeedback = (
  roundId: string,
  initialFeedback?: { vote: 'up' | 'down' }
): UseFeedbackReturn => {
  const conversationId = useConversationId();
  const { conversationsService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();
  const queryClient = useQueryClient();
  const serverVote = initialFeedback?.vote ?? null;
  const [vote, setVoteState] = useState<Vote>(serverVote);
  const [chips, setChips] = useState<string[]>([]);
  const [comment, setCommentState] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedFading, setSubmittedFading] = useState(false);

  const voteRef = useRef(vote);
  const chipsRef = useRef(chips);
  const commentRef = useRef(comment);
  const initialFeedbackRef = useRef(initialFeedback);
  const timer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUserInteractedRef = useRef(false);
  voteRef.current = vote;
  chipsRef.current = chips;
  commentRef.current = comment;
  initialFeedbackRef.current = initialFeedback;

  useEffect(() => {
    return () => {
      if (timer1Ref.current) clearTimeout(timer1Ref.current);
      if (timer2Ref.current) clearTimeout(timer2Ref.current);
    };
  }, []);

  const clearSubmittedTimers = useCallback(() => {
    if (timer1Ref.current) clearTimeout(timer1Ref.current);
    if (timer2Ref.current) clearTimeout(timer2Ref.current);
  }, []);

  useEffect(() => {
    hasUserInteractedRef.current = false;
    clearSubmittedTimers();
    setVoteState(initialFeedbackRef.current?.vote ?? null);
    setChips([]);
    setCommentState('');
    setModalOpen(false);
    setInviteVisible(false);
    setSubmitted(false);
    setSubmittedFading(false);
  }, [roundId, clearSubmittedTimers]);

  useEffect(() => {
    if (!hasUserInteractedRef.current) {
      setVoteState(serverVote);
    }
  }, [serverVote]);

  const invalidateConversation = useCallback(() => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
    }
  }, [conversationId, queryClient]);

  const reset = useCallback(() => {
    clearSubmittedTimers();
    setVoteState(null);
    setChips([]);
    setCommentState('');
    setModalOpen(false);
    setInviteVisible(false);
    setSubmitted(false);
    setSubmittedFading(false);
  }, [clearSubmittedTimers]);

  const setVote = useCallback(
    (next: 'up' | 'down') => {
      const prev = voteRef.current;
      hasUserInteractedRef.current = true;

      if (prev === next) {
        if (conversationId) {
          conversationsService
            .submitRoundFeedback({ conversationId, roundId, vote: null })
            .then(invalidateConversation);
        }
        reset();
        return;
      }

      clearSubmittedTimers();
      setChips([]);
      setCommentState('');
      setSubmitted(false);
      setSubmittedFading(false);

      if (next === 'down') {
        setVoteState('down');
        setModalOpen(true);
        setInviteVisible(false);
      } else {
        setVoteState('up');
        setModalOpen(false);
        setInviteVisible(true);
        if (conversationId) {
          conversationsService
            .submitRoundFeedback({ conversationId, roundId, vote: 'up' })
            .then(invalidateConversation);
        }
      }
    },
    [
      conversationId,
      conversationsService,
      roundId,
      reset,
      clearSubmittedTimers,
      invalidateConversation,
    ]
  );

  const toggleChip = useCallback((chip: string) => {
    setChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));
  }, []);

  const setComment = useCallback((value: string) => {
    setCommentState(value);
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
    if (!currentVote || !conversationId) return;

    hasUserInteractedRef.current = true;
    const currentChips = chipsRef.current;
    const currentComment = commentRef.current;

    setModalOpen(false);

    conversationsService
      .submitRoundFeedback({
        conversationId,
        roundId,
        vote: currentVote,
        chips: currentChips,
        comment: currentComment,
      })
      .then(() => {
        invalidateConversation();
        setSubmitted(true);
        setSubmittedFading(false);

        clearSubmittedTimers();
        timer1Ref.current = setTimeout(() => {
          setSubmittedFading(true);
          timer2Ref.current = setTimeout(() => {
            setSubmitted(false);
            setSubmittedFading(false);
          }, SUBMITTED_FADE_MS);
        }, SUBMITTED_VISIBLE_MS);
      })
      .catch(() => {
        addErrorToast({ title: labels.submitError });
        reset();
      });
  }, [
    conversationId,
    conversationsService,
    roundId,
    clearSubmittedTimers,
    addErrorToast,
    reset,
    invalidateConversation,
  ]);

  return {
    vote,
    chips,
    comment,
    modalOpen,
    inviteVisible,
    submitted,
    submittedFading,
    setVote,
    toggleChip,
    setComment,
    openModal,
    closeModal,
    dismissInvite,
    submit,
  };
};
