/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { FeedbackRegistryEntry } from '@kbn/feedback-registry';
import { FeedbackTextArea } from './feedback_text_area';
import { EmailSection } from './email';
import { SessionInfoDisclaimer } from './session_info_disclaimer';
import { CsatButtons } from './csat_buttons';

interface Props {
  core: CoreStart;
  selectedCsatOptionId: string;
  questionAnswers: Record<string, string>;
  allowEmailContact: boolean;
  email: string;
  questions: FeedbackRegistryEntry[];
  appTitle: string;
  handleChangeCsatOptionId: (optionId: string) => void;
  handleChangeQuestionAnswer: (questionId: string, answer: string) => void;
  handleChangeAllowEmailContact: (allow: boolean) => void;
  handleChangeEmail: (email: string) => void;
}
export const FeedbackBody = ({
  core,
  selectedCsatOptionId,
  questionAnswers,
  allowEmailContact,
  email,
  questions,
  appTitle,
  handleChangeCsatOptionId,
  handleChangeQuestionAnswer,
  handleChangeAllowEmailContact,
  handleChangeEmail,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const bodyCss = css`
    padding-top: ${euiTheme.size.m};
    width: 600px;
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem css={bodyCss} data-test-subj="feedbackBody">
        <EuiForm component="form">
          <CsatButtons
            appTitle={appTitle}
            selectedCsatOptionId={selectedCsatOptionId}
            handleChangeCsatOptionId={handleChangeCsatOptionId}
          />
          <EuiSpacer size="m" />
          {questions.length > 0 &&
            questions.map((question) => (
              <FeedbackTextArea
                key={question.id}
                value={questionAnswers[question.id] || ''}
                handleChangeValue={(value) => handleChangeQuestionAnswer(question.id, value)}
                testId={`feedback-${question.id}-text-area`}
                label={
                  question?.label
                    ? i18n.translate(question.label.i18nId, {
                        defaultMessage: question.label.defaultMessage,
                      })
                    : undefined
                }
                aria-label={
                  question?.ariaLabel
                    ? i18n.translate(question.ariaLabel.i18nId, {
                        defaultMessage: question.ariaLabel.defaultMessage,
                      })
                    : undefined
                }
                placeholder={
                  question?.placeholder
                    ? i18n.translate(question.placeholder.i18nId, {
                        defaultMessage: question.placeholder.defaultMessage,
                      })
                    : undefined
                }
              />
            ))}
          <EmailSection
            allowEmailContact={allowEmailContact}
            email={email}
            security={core?.security}
            handleChangeAllowEmailContact={handleChangeAllowEmailContact}
            handleChangeEmail={handleChangeEmail}
          />
        </EuiForm>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      <EuiFlexItem>
        <SessionInfoDisclaimer />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
