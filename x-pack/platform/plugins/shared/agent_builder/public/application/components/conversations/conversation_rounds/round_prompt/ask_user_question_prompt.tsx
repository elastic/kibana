/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiIcon,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  labels,
  containerStyles,
  optionCardStyles,
  customRowStyles,
} from './ask_user_question_prompt_utils';
import type { AskUserQuestionPromptProps } from './ask_user_question_prompt_utils';
import { useAskUserQuestionPrompt } from './use_ask_user_question_prompt';

export type { AskUserQuestionPromptProps } from './ask_user_question_prompt_utils';

export const AskUserQuestionPrompt = (props: AskUserQuestionPromptProps) => {
  const { euiTheme } = useEuiTheme();
  const { refs, question, ui, handlers } = useAskUserQuestionPrompt(props);
  const {
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
  } = question;

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
            <EuiFlexItem
              key={`${currentIndex}-${optionIndex}`}
              grow={false}
              ref={refs.setOptionRef(optionIndex)}
            >
              <EuiCheckableCard
                id={inputId}
                label={option.label}
                checkableType={currentQuestion.multi_select ? 'checkbox' : 'radio'}
                name={questionGroupName}
                checked={checked}
                disabled={ui.isInteractionDisabled}
                css={optionCardStyles}
                onChange={(e) =>
                  handlers.handleOptionPick(
                    optionIndex,
                    currentQuestion.multi_select ? e.target.checked : true
                  )
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) =>
                  handlers.handleOptionKeyDown(e, optionIndex)
                }
              >
                {option.description && (
                  <EuiText size="xs" color="subdued">
                    {option.description}
                  </EuiText>
                )}
              </EuiCheckableCard>
            </EuiFlexItem>
          );
        })}

        {/* Custom / "Be more specific" row */}
        <EuiFlexItem grow={false} ref={refs.customRowRef}>
          <EuiCheckableCard
            id={`${baseId}-q${currentIndex}-custom`}
            label=""
            css={customRowStyles}
            checkableType={currentQuestion.multi_select ? 'checkbox' : 'radio'}
            name={questionGroupName}
            checked={isCustomActive}
            disabled={ui.isInteractionDisabled}
            onChange={(e) =>
              handlers.handleCustomToggle(currentQuestion.multi_select ? e.target.checked : true)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) =>
              handlers.handleOptionKeyDown(e, customRowIndex)
            }
            data-test-subj="agentBuilderAskUserQuestionPromptCustomRow"
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="pencil" size="m" color="subdued" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                {/* Intentional: this field is only ever reached by selecting the custom
                    option above (or restored on Back) — it must not be a stray Tab stop. */}
                {/* eslint-disable-next-line @elastic/eui/accessible-interactive-element */}
                <EuiFieldText
                  inputRef={refs.customInputRef}
                  tabIndex={-1}
                  value={currentDraft.custom ?? ''}
                  placeholder={labels.customPlaceholder}
                  onChange={(e) => handlers.handleCustomChange(e.target.value)}
                  onKeyDown={handlers.handleCustomFieldKeyDown}
                  disabled={ui.isInteractionDisabled}
                  isInvalid={ui.showCustomError}
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
            </EuiFlexGroup>
          </EuiCheckableCard>
        </EuiFlexItem>

        {/* Validation error */}
        {ui.showCustomError && (
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
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={labels.backButton} disableScreenReaderOutput>
                <EuiButtonIcon
                  onClick={handlers.handleBack}
                  disabled={ui.isInteractionDisabled || currentIndex === 0}
                  size="s"
                  color="text"
                  iconType="sortLeft"
                  iconSize="m"
                  aria-label={labels.backButton}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              buttonRef={refs.skipButtonRef}
              onClick={handlers.handleSkip}
              disabled={ui.isInteractionDisabled}
              size="s"
              color="text"
              iconType="sortRight"
              iconSize="m"
              iconSide="right"
            >
              {labels.skipButton}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              buttonRef={refs.confirmButtonRef}
              onClick={handlers.handleConfirm}
              isLoading={ui.isLoading && isFinalQuestion}
              disabled={ui.isInteractionDisabled || !canConfirm}
              fill
              size="s"
              color="primary"
            >
              {isFinalQuestion ? labels.confirmButton : labels.continueButton}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
