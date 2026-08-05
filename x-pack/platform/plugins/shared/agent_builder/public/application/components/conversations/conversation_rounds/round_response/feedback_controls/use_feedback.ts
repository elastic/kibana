/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { submitFeedback } from './feedback_api';

type Vote = 'up' | 'down' | null;

export interface FeedbackState {
  vote: Vote;
  chips: string[];
  comment: string;
  modalOpen: boolean;
  inviteVisible: boolean;
  submitted: boolean;
  isSubmitting: boolean;
}

export interface UseFeedbackReturn extends FeedbackState {
  setVote: (vote: 'up' | 'down') => void;
  toggleChip: (chip: string) => void;
  setComment: (value: string) => void;
  openModal: () => void;
  closeModal: () => void;
  dismissInvite: () => void;
  submit: () => Promise<void>;
}

export const useFeedback = (roundId: string): UseFeedbackReturn => {
  const [vote, setVoteState] = useState<Vote>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [comment, setCommentState] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs so callbacks always see latest values without re-creating
  const voteRef = useRef(vote);
  const chipsRef = useRef(chips);
  const commentRef = useRef(comment);
  voteRef.current = vote;
  chipsRef.current = chips;
  commentRef.current = comment;

  const reset = useCallback(() => {
    setVoteState(null);
    setChips([]);
    setCommentState('');
    setModalOpen(false);
    setInviteVisible(false);
    setSubmitted(false);
  }, []);

  const setVote = useCallback(
    (next: 'up' | 'down') => {
      const prev = voteRef.current;

      if (prev === next) {
        reset();
        return;
      }

      setChips([]);
      setCommentState('');
      setSubmitted(false);

      if (next === 'down') {
        setVoteState('down');
        setModalOpen(true);
        setInviteVisible(false);
      } else {
        setVoteState('up');
        setModalOpen(false);
        setInviteVisible(true);
        submitFeedback({ roundId, vote: 'up', chips: [], comment: '' });
      }
    },
    [roundId, reset]
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
    reset();
  }, [reset]);

  const dismissInvite = useCallback(() => setInviteVisible(false), []);

  const submit = useCallback(async () => {
    const currentVote = voteRef.current;
    if (!currentVote) return;
    setIsSubmitting(true);
    try {
      await submitFeedback({
        roundId,
        vote: currentVote,
        chips: chipsRef.current,
        comment: commentRef.current,
      });
      setSubmitted(true);
      setModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [roundId]);

  return {
    vote,
    chips,
    comment,
    modalOpen,
    inviteVisible,
    submitted,
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
