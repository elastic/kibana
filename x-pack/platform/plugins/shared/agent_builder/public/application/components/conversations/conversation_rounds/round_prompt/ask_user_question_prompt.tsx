/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiIcon,
  EuiNotificationBadge,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  labels,
  containerStyles,
  optionCardStyles,
  customRowStyles,
  draftToAnswer,
  isDraftAnswerable,
  isCustomTextMissing,
  useAskUserQuestionTelemetry,
} from './ask_user_question_prompt_utils';
import type { AnswerDraft, AskUserQuestionPromptProps } from './ask_user_question_prompt_utils';

export type { AskUserQuestionPromptProps } from './ask_user_question_prompt_utils';

const HANDLED_DIGIT_KEY = /^[1-9]$/;

/** True when the focused element can accept keyboard input — we don't steal those keys. */
const isLiveTextEntry = (el: Element | null): boolean => {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return !el.disabled && !el.readOnly;
  }
  return el instanceof HTMLElement && el.isContentEditable;
};

const KeyHint = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      aria-hidden="true"
      css={css`
        display: inline-flex;
        align-items: center;
        height: 1em;
        vertical-align: middle;
        margin-left: ${euiTheme.size.xs};
        color: inherit;
        opacity: 0.7;
        font-size: ${euiTheme.font.scale.m * euiTheme.base}px;
        font-family: ${euiTheme.font.familyCode};
      `}
    >
      {children}
    </span>
  );
};

export const AskUserQuestionPrompt = ({
  promptId,
  questions,
  onSubmit,
  isLoading = false,
  isDisabled = false,
}: AskUserQuestionPromptProps) => {
  const { euiTheme } = useEuiTheme();
  const totalQuestions = questions.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<AnswerDraft[]>(() => questions.map(() => ({})));
  const [showCustomError, setShowCustomError] = useState(false);
  const baseId = useGeneratedHtmlId({ prefix: 'askUserQuestionPrompt' });
  const customInputRef = useRef<HTMLInputElement>(null);

  const { reportPromptShown, reportQuestionAnswered } = useAskUserQuestionTelemetry({
    promptId,
    questions,
  });

  useEffect(() => {
    reportPromptShown();
  }, [reportPromptShown]);

  // When the question changes, drop focus from the custom input so it never
  // carries over to the next question (e.g. user typed in custom on Q1 then
  // hit Cmd+Enter — focus would otherwise stick to the new question's input).
  useEffect(() => {
    if (customInputRef.current && document.activeElement === customInputRef.current) {
      customInputRef.current.blur();
    }
  }, [currentIndex]);

  const currentQuestion = questions[currentIndex];
  const currentDraft = drafts[currentIndex];
  const isFinalQuestion = currentIndex === totalQuestions - 1;
  const canConfirm = !currentDraft.skipped && isDraftAnswerable(currentDraft);
  const questionGroupName = `${baseId}-q${currentIndex}`;
  const isInteractionDisabled = isDisabled || isLoading;

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

  const handleSkipAll = useCallback(() => {
    reportQuestionAnswered(currentIndex, {}, 'skipped_all');
    onSubmit({ answers: questions.map(() => ({ skipped: true })) });
  }, [currentIndex, onSubmit, questions, reportQuestionAnswered]);

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

      // Single-select: build the next draft inline and auto-advance / submit in the
      // same call stack — avoids a stale-state read between setState and the
      // advance decision.
      const nextDraft: AnswerDraft = {
        skipped: false,
        choice: [optionIndex],
        custom: currentDraft.custom,
        customSelected: false,
      };
      updateDraft(nextDraft);
      reportQuestionAnswered(currentIndex, nextDraft, 'answered');
      if (isFinalQuestion) {
        handleSubmit(nextDraft);
        return;
      }
      setShowCustomError(false);
      setCurrentIndex((idx) => idx + 1);
    },
    [
      currentQuestion.multi_select,
      currentDraft,
      updateDraft,
      reportQuestionAnswered,
      currentIndex,
      isFinalQuestion,
      handleSubmit,
    ]
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
        return;
      }
      updateDraft({
        skipped: false,
        customSelected: selected,
        custom: currentDraft.custom,
        choice: undefined,
      });
    },
    [currentQuestion.multi_select, currentDraft, updateDraft]
  );

  const isCustomActive = !!currentDraft.customSelected;

  // Keep the latest handler closures in a ref so the document-level keydown
  // listener (below) can stay registered once for the lifetime of the prompt.
  const keyboardHandlersRef = useRef({
    isInteractionDisabled,
    currentChoice: currentDraft.choice,
    optionsCount: currentQuestion.options.length,
    handleConfirm,
    handleSkipAll,
    handleSkip,
    handleBack,
    handleOptionPick,
    handleCustomToggle,
  });
  keyboardHandlersRef.current = {
    isInteractionDisabled,
    currentChoice: currentDraft.choice,
    optionsCount: currentQuestion.options.length,
    handleConfirm,
    handleSkipAll,
    handleSkip,
    handleBack,
    handleOptionPick,
    handleCustomToggle,
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const h = keyboardHandlersRef.current;
      if (h.isInteractionDisabled) return;

      const active = document.activeElement;
      const isCustomInputFocused = !!customInputRef.current && customInputRef.current === active;

      // Pass keys through to any text field the user is actively typing in.
      // Disabled fields (e.g., the chat input while a HITL prompt is open)
      // can't receive input, so they don't block shortcuts.
      if (!isCustomInputFocused && isLiveTextEntry(active)) return;

      // Escape fires even while typing in the custom input.
      // Might be revisited when when decide to enable the STOP button in the chat input during HITL
      if (event.key === 'Escape') {
        event.preventDefault();
        h.handleSkipAll();
        return;
      }

      if (isCustomInputFocused) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        h.handleConfirm();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        h.handleBack();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        h.handleSkip();
        return;
      }

      if (HANDLED_DIGIT_KEY.test(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
        const optionIndex = Number(event.key) - 1;
        if (optionIndex < h.optionsCount) {
          event.preventDefault();
          const alreadyChecked = (h.currentChoice ?? []).includes(optionIndex);
          h.handleOptionPick(optionIndex, !alreadyChecked);
          return;
        }
        if (optionIndex === h.optionsCount) {
          event.preventDefault();
          h.handleCustomToggle(true);
          customInputRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const optionRowWrapperStyles = css`
    position: relative;
  `;
  const optionBadgeAnchorStyles = css`
    position: absolute;
    right: ${euiTheme.size.base};
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  `;

  return (
    <EuiFlexGroup
      direction="column"
      responsive={false}
      gutterSize="none"
      css={containerStyles}
      data-test-subj="agentBuilderAskUserQuestionPrompt"
    >
      {/* Question text (left) + progress label (right) */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{currentQuestion.question}</h3>
            </EuiTitle>
            {currentQuestion.multi_select && (
              <EuiText component="p" size="s" color="subdued" css={{ marginTop: '2px' }}>
                <FormattedMessage
                  id="xpack.agentBuilder.askUserQuestionPrompt.multiSelectSubtitle"
                  defaultMessage="Select one or more"
                />
              </EuiText>
            )}
          </EuiFlexItem>
          {totalQuestions > 1 && (
            <EuiFlexItem grow={false} css={{ paddingTop: '0.35rem' }}>
              <EuiText component="span" size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.agentBuilder.askUserQuestionPrompt.progressLabel"
                  defaultMessage="{current} of {total}"
                  values={{ current: currentIndex + 1, total: totalQuestions }}
                />
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Options */}
      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        responsive={false}
        css={css`
          margin-top: ${euiTheme.size.s};
        `}
      >
        {currentQuestion.options.map((option, optionIndex) => {
          const inputId = `${baseId}-q${currentIndex}-opt${optionIndex}`;
          const checked = (currentDraft.choice ?? []).includes(optionIndex);
          return (
            <EuiFlexItem key={`${currentIndex}-${optionIndex}`} grow={false}>
              <div css={optionRowWrapperStyles}>
                <EuiCheckableCard
                  id={inputId}
                  label={option.label}
                  checkableType={currentQuestion.multi_select ? 'checkbox' : 'radio'}
                  name={questionGroupName}
                  checked={checked}
                  disabled={isInteractionDisabled}
                  css={optionCardStyles}
                  onChange={(e) =>
                    handleOptionPick(
                      optionIndex,
                      currentQuestion.multi_select ? e.target.checked : true
                    )
                  }
                >
                  {option.description && (
                    <EuiText size="xs" color="subdued">
                      {option.description}
                    </EuiText>
                  )}
                </EuiCheckableCard>
                {/* Badge positioned over the card so it doesn't pollute the
                      label's text content (would break getByLabelText). */}
                <div aria-hidden="true" css={optionBadgeAnchorStyles}>
                  <EuiNotificationBadge
                    size="s"
                    color="subdued"
                    css={css`
                      padding-inline: ${euiTheme.size.xs};
                    `}
                  >
                    {optionIndex + 1}
                  </EuiNotificationBadge>
                </div>
              </div>
            </EuiFlexItem>
          );
        })}

        {/* Custom / "Be more specific" row */}
        <EuiFlexItem grow={false}>
          <EuiCheckableCard
            id={`${baseId}-q${currentIndex}-custom`}
            label=""
            css={customRowStyles}
            checkableType={currentQuestion.multi_select ? 'checkbox' : 'radio'}
            name={questionGroupName}
            checked={isCustomActive}
            disabled={isInteractionDisabled}
            onChange={(e) =>
              handleCustomToggle(currentQuestion.multi_select ? e.target.checked : true)
            }
            data-test-subj="agentBuilderAskUserQuestionPromptCustomRow"
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="pencil" size="m" color="subdued" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldText
                  inputRef={customInputRef}
                  value={currentDraft.custom ?? ''}
                  placeholder={labels.customPlaceholder}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  disabled={isInteractionDisabled}
                  isInvalid={showCustomError}
                  compressed
                  css={css`
                    box-shadow: none;
                    outline: none !important;
                    outline-style: none !important;
                    ':hover' {
                      box-shadow: none;
                      outline: none !important;
                      outline-style: none !important;
                    }
                  `}
                  fullWidth
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {/* The custom row has zero right padding (see customRowStyles); compensate
                      so the badge number aligns with the regular option numbers above. */}
                <EuiNotificationBadge
                  size="s"
                  color="subdued"
                  aria-hidden="true"
                  css={css`
                    margin-right: ${euiTheme.size.base};
                    padding-inline: ${euiTheme.size.xs};
                  `}
                >
                  {currentQuestion.options.length + 1}
                </EuiNotificationBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCheckableCard>
        </EuiFlexItem>

        {/* Validation error */}
        {showCustomError && (
          <EuiFlexItem grow={false}>
            <EuiFormErrorText>{labels.customError}</EuiFormErrorText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {/* Action bar */}
      <EuiFlexGroup
        direction="row"
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
        css={css`
          margin-top: ${euiTheme.size.base};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            onClick={handleBack}
            disabled={currentIndex === 0 || isInteractionDisabled}
            iconType="sortLeft"
            size="m"
            color="text"
            display="empty"
            aria-label={labels.backButton}
          />
        </EuiFlexItem>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleSkip}
              disabled={isInteractionDisabled}
              size="s"
              color="text"
              iconType="sortRight"
              iconSide="right"
            >
              {labels.skipQuestionButton}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleConfirm}
              isLoading={isLoading && isFinalQuestion}
              disabled={isInteractionDisabled || !canConfirm}
              fill
              size="s"
              color="primary"
            >
              {isFinalQuestion ? labels.confirmButton : labels.continueButton}
              <KeyHint>↵</KeyHint>
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
