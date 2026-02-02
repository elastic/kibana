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
import type { FeedbackRegistryEntry } from '@kbn/feedback-registry/common';
import { FeedbackTextArea } from './feedback_text_area';
import { EmailSection } from './email';
import { SessionInfoDisclaimer } from './session_info_disclaimer';
import { CsatButtons } from './csat_buttons';

interface Props {
  core: CoreStart;
  selectedCsatOptionId: string;
  experienceFeedbackText: string;
  generalFeedbackText: string;
  allowEmailContact: boolean;
  email: string;
  questions: FeedbackRegistryEntry[];
  appTitle?: string;
  handleChangeCsatOptionId: (optionId: string) => void;
  handleChangeExperienceFeedbackText: (feedback: string) => void;
  handleChangeGeneralFeedbackText: (feedback: string) => void;
  handleChangeAllowEmailContact: (allow: boolean) => void;
  handleChangeEmail: (email: string) => void;
}
export const FeedbackBody = ({
  core,
  selectedCsatOptionId,
  experienceFeedbackText,
  generalFeedbackText,
  allowEmailContact,
  email,
  questions: [firstQuestion, secondQuestion],
  appTitle,
  handleChangeCsatOptionId,
  handleChangeExperienceFeedbackText,
  handleChangeGeneralFeedbackText,
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
          <FeedbackTextArea
            value={experienceFeedbackText}
            handleChangeValue={handleChangeExperienceFeedbackText}
            testId="feedbackExperienceTextArea"
            label={
              firstQuestion?.label
                ? i18n.translate(firstQuestion.label.i18nId, {
                    defaultMessage: firstQuestion.label.defaultMessage,
                  })
                : undefined
            }
            aria-label={
              firstQuestion?.ariaLabel
                ? i18n.translate(firstQuestion.ariaLabel.i18nId, {
                    defaultMessage: firstQuestion.ariaLabel.defaultMessage,
                  })
                : undefined
            }
            placeholder={
              firstQuestion?.placeholder
                ? i18n.translate(firstQuestion.placeholder.i18nId, {
                    defaultMessage: firstQuestion.placeholder.defaultMessage,
                  })
                : undefined
            }
          />
          <EuiSpacer size="l" />
          <FeedbackTextArea
            value={generalFeedbackText}
            handleChangeValue={handleChangeGeneralFeedbackText}
            testId="feedbackGeneralTextArea"
            label={
              secondQuestion?.label
                ? i18n.translate(secondQuestion.label.i18nId, {
                    defaultMessage: secondQuestion.label.defaultMessage,
                  })
                : undefined
            }
            aria-label={
              secondQuestion?.ariaLabel
                ? i18n.translate(secondQuestion.ariaLabel.i18nId, {
                    defaultMessage: secondQuestion.ariaLabel.defaultMessage,
                  })
                : undefined
            }
            placeholder={
              secondQuestion?.placeholder
                ? i18n.translate(secondQuestion.placeholder.i18nId, {
                    defaultMessage: secondQuestion.placeholder.defaultMessage,
                  })
                : undefined
            }
          />
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
