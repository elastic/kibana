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
  commentOpen: boolean;
  inviteVisible: boolean;
  submitted: boolean;
  isSubmitting: boolean;
}

export interface UseFeedbackReturn extends FeedbackState {
  setVote: (vote: 'up' | 'down') => void;
  toggleChip: (chip: string) => void;
  openComment: () => void;
  closeComment: () => void;
  dismissInvite: () => void;
  submit: (comment: string) => Promise<void>;
}

export const useFeedback = (roundId: string): UseFeedbackReturn => {
  const [vote, setVoteState] = useState<Vote>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [commentOpen, setCommentOpen] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const voteRef = useRef(vote);
  const chipsRef = useRef(chips);
  voteRef.current = vote;
  chipsRef.current = chips;

  const setVote = useCallback((next: 'up' | 'down') => {
    setVoteState((prev) => {
      if (prev === next) {
        setChips([]);
        setCommentOpen(false);
        setInviteVisible(false);
        return null;
      }
      setChips([]);
      setSubmitted(false);
      if (next === 'down') {
        setCommentOpen(true);
        setInviteVisible(false);
      } else {
        setCommentOpen(false);
        setInviteVisible(true);
      }
      return next;
    });
  }, []);

  const toggleChip = useCallback((chip: string) => {
    setChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));
  }, []);

  const openComment = useCallback(() => {
    setCommentOpen(true);
    setInviteVisible(false);
  }, []);

  const closeComment = useCallback(() => setCommentOpen(false), []);

  const dismissInvite = useCallback(() => setInviteVisible(false), []);

  const submit = useCallback(
    async (comment: string) => {
      const currentVote = voteRef.current;
      if (!currentVote) return;
      setIsSubmitting(true);
      try {
        await submitFeedback({ roundId, vote: currentVote, chips: chipsRef.current, comment });
        setSubmitted(true);
        setCommentOpen(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [roundId]
  );

  return {
    vote,
    chips,
    commentOpen,
    inviteVisible,
    submitted,
    isSubmitting,
    setVote,
    toggleChip,
    openComment,
    closeComment,
    dismissInvite,
    submit,
  };
};
