/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';
import {
  draftToAnswer,
  isDraftAnswerable,
  isCustomTextMissing,
  useAskUserQuestionTelemetry,
} from './ask_user_question_prompt_utils';
import type { AnswerDraft, AskUserQuestionPromptProps } from './ask_user_question_prompt_utils';

export const useAskUserQuestionPrompt = ({
  promptId,
  questions,
  onSubmit,
  isLoading = false,
  isDisabled = false,
}: AskUserQuestionPromptProps) => {
  const totalQuestions = questions.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<AnswerDraft[]>(() => questions.map(() => ({})));
  const [showCustomError, setShowCustomError] = useState(false);
  const baseId = useGeneratedHtmlId({ prefix: 'askUserQuestionPrompt' });
  const customInputRef = useRef<HTMLInputElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  // Refs to each option, so we can focus them by index
  const optionRefs = useRef(new Map<number, HTMLDivElement>());
  const customRowRef = useRef<HTMLDivElement>(null);
  // Keeps a copy of drafts so the focus effect below always has the latest value
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const { reportPromptShown, reportQuestionAnswered } = useAskUserQuestionTelemetry({
    promptId,
    questions,
  });

  const currentQuestion = questions[currentIndex];
  const currentDraft = drafts[currentIndex];
  const isFinalQuestion = currentIndex === totalQuestions - 1;
  const canConfirm = !currentDraft.skipped && isDraftAnswerable(currentDraft);
  const customRowIndex = currentQuestion.options.length;
  const totalOptionStops = customRowIndex + 1; // predefined options + the custom row
  const questionGroupName = `${baseId}-q${currentIndex}`;
  const isCustomActive = !!currentDraft.customSelected;
  const isInteractionDisabled = isDisabled || isLoading;

  // Reports the prompt-shown telemetry event once, when this prompt first appears
  useEffect(() => {
    reportPromptShown();
  }, [reportPromptShown]);

  // Focuses the right answer whenever the question changes
  useEffect(() => {
    const draft = draftsRef.current[currentIndex];
    if (draft?.customSelected) {
      customInputRef.current?.focus();
      return;
    }
    const index = draft?.choice?.[0] ?? 0;
    const container = index < customRowIndex ? optionRefs.current.get(index) : customRowRef.current;
    container?.querySelector<HTMLElement>('input')?.focus();
  }, [currentIndex, customRowIndex, isDisabled]);

  const setOptionRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) {
        optionRefs.current.set(index, el);
      } else {
        optionRefs.current.delete(index);
      }
    },
    []
  );

  const focusOptionAt = useCallback(
    (index: number) => {
      const container =
        index < customRowIndex ? optionRefs.current.get(index) : customRowRef.current;
      // EUI's radio input doesn't support refs, so we look it up this way instead
      container?.querySelector<HTMLElement>('input')?.focus();
    },
    [customRowIndex]
  );

  // The button is still disabled at this point (state hasn't re-rendered yet), and a
  // disabled element can't be focused — deferring lets the re-render happen first
  const focusConfirmButton = useCallback(() => {
    setTimeout(() => confirmButtonRef.current?.focus(), 0);
  }, []);

  const updateDraft = useCallback(
    (next: AnswerDraft) => {
      setShowCustomError(false);
      setDrafts((prev) => {
        const copy = prev.slice();
        copy[currentIndex] = next;
        return copy;
      });
    },
    [currentIndex]
  );

  const handleSubmit = useCallback(
    (overrideLast?: AnswerDraft) => {
      const finalDrafts = overrideLast
        ? drafts.map((draft, i) => (i === currentIndex ? overrideLast : draft))
        : drafts;
      onSubmit({ answers: finalDrafts.map(draftToAnswer) });
    },
    [drafts, currentIndex, onSubmit]
  );

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;
    if (isCustomTextMissing(currentDraft)) {
      setShowCustomError(true);
      return;
    }
    reportQuestionAnswered(currentIndex, currentDraft, 'answered');
    if (isFinalQuestion) {
      handleSubmit();
      return;
    }
    setShowCustomError(false);
    setCurrentIndex((idx) => idx + 1);
  }, [
    canConfirm,
    currentDraft,
    currentIndex,
    handleSubmit,
    isFinalQuestion,
    reportQuestionAnswered,
  ]);

  const handleSkip = useCallback(() => {
    const skippedDraft: AnswerDraft = { skipped: true };
    reportQuestionAnswered(currentIndex, skippedDraft, 'skipped');
    if (isFinalQuestion) {
      handleSubmit(skippedDraft);
      return;
    }
    updateDraft(skippedDraft);
    setCurrentIndex((idx) => idx + 1);
  }, [currentIndex, handleSubmit, isFinalQuestion, reportQuestionAnswered, updateDraft]);

  const handleBack = useCallback(() => {
    setShowCustomError(false);
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const handleOptionPick = useCallback(
    (optionIndex: number, checked: boolean) => {
      if (currentQuestion.multi_select) {
        const prevChoice = currentDraft.choice ?? [];
        const nextChoice = checked
          ? Array.from(new Set([...prevChoice, optionIndex])).sort((a, b) => a - b)
          : prevChoice.filter((c) => c !== optionIndex);
        updateDraft({
          ...currentDraft,
          skipped: false,
          choice: nextChoice.length > 0 ? nextChoice : undefined,
        });
        return;
      }
      const nextDraft: AnswerDraft = {
        skipped: false,
        choice: [optionIndex],
        custom: currentDraft.custom,
        customSelected: false,
      };
      updateDraft(nextDraft);
      if (isFinalQuestion) {
        focusConfirmButton();
        return;
      }
      reportQuestionAnswered(currentIndex, nextDraft, 'answered');
      setCurrentIndex((idx) => idx + 1);
    },
    [
      currentQuestion.multi_select,
      currentDraft,
      updateDraft,
      isFinalQuestion,
      focusConfirmButton,
      reportQuestionAnswered,
      currentIndex,
    ]
  );

  // Arrow keys normally also select the option, not just move focus — we stop that here
  const handleOptionKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (currentQuestion.multi_select) return;
      if (event.key === 'Tab' && !event.shiftKey) {
        // Tab skips Back and goes straight to Continue or Skip
        event.preventDefault();
        if (canConfirm) {
          confirmButtonRef.current?.focus();
        } else {
          skipButtonRef.current?.focus();
        }
        return;
      }
      if (event.key === ' ' && index === customRowIndex) {
        // Picking an already-checked option again won't fire onChange, so handle it here too
        customInputRef.current?.focus();
        return;
      }
      const isForward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      const isBackward = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
      if (!isForward && !isBackward) return;
      event.preventDefault();
      focusOptionAt((index + (isForward ? 1 : -1) + totalOptionStops) % totalOptionStops);
    },
    [currentQuestion.multi_select, customRowIndex, totalOptionStops, focusOptionAt, canConfirm]
  );

  const handleCustomChange = useCallback(
    (value: string) => {
      const custom = value.length > 0 ? value : undefined;
      if (currentQuestion.multi_select) {
        updateDraft({ ...currentDraft, skipped: false, custom, customSelected: true });
        return;
      }
      updateDraft({ skipped: false, custom, customSelected: true, choice: undefined });
    },
    [currentQuestion.multi_select, currentDraft, updateDraft]
  );

  const handleCustomToggle = useCallback(
    (selected: boolean) => {
      if (currentQuestion.multi_select) {
        updateDraft({ ...currentDraft, skipped: false, customSelected: selected });
      } else {
        updateDraft({
          skipped: false,
          customSelected: selected,
          custom: currentDraft.custom,
          choice: undefined,
        });
      }
      // Focus the text field when the custom option gets checked by mouse
      if (selected) {
        customInputRef.current?.focus();
      }
    },
    [currentQuestion.multi_select, currentDraft, updateDraft]
  );

  // Tab from this field jumps straight to Continue, skipping Back and Skip
  const handleCustomFieldKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Tab' || event.shiftKey || !canConfirm) return;
      event.preventDefault();
      confirmButtonRef.current?.focus();
    },
    [canConfirm]
  );

  return {
    refs: { customInputRef, confirmButtonRef, skipButtonRef, customRowRef, setOptionRef },
    question: {
      baseId,
      currentQuestion,
      currentIndex,
      totalQuestions,
      currentDraft,
      isFinalQuestion,
      canConfirm,
      customRowIndex,
      questionGroupName,
      isCustomActive,
    },
    ui: { showCustomError, isInteractionDisabled, isLoading },
    handlers: {
      handleOptionPick,
      handleOptionKeyDown,
      handleCustomChange,
      handleCustomToggle,
      handleCustomFieldKeyDown,
      handleBack,
      handleSkip,
      handleConfirm,
    },
  };
};
