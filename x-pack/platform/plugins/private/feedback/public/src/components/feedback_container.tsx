/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { getCurrentAppTitleAndId, getQuestions } from '../utils';
import { FeedbackHeader } from './header';
import { FeedbackBody } from './body/feedback_body';
import { FeedbackFooter } from './footer/feedback_footer';
import { FEEDBACK_SUBMITTED_EVENT_TYPE, type FeedbackSubmittedEventData } from '../telemetry';

interface Props {
  core: CoreStart;
  cloud?: CloudStart;
  hideFeedbackContainer: () => void;
}

export const FeedbackContainer = ({ core, cloud, hideFeedbackContainer }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [experienceFeedbackText, setExperienceFeedbackText] = useState('');
  const [generalFeedbackText, setGeneralFeedbackText] = useState('');
  const [selectedCsatOptionId, setSelectedCsatOptionId] = useState('');
  const [allowEmailContact, setAllowEmailContact] = useState(false);
  const [email, setEmail] = useState('');
  const [solutionView, setSolutionView] = useState<string | null>(null);

  const appDetails = getCurrentAppTitleAndId(core);
  const questions = getQuestions(appDetails?.id);

  const [firstQuestion, secondQuestion] = questions;

  useEffect(() => {
    const solutionSub = core.chrome.getActiveSolutionNavId$().subscribe((solutionId) => {
      setSolutionView(solutionId);
    });

    return () => {
      solutionSub.unsubscribe();
    };
  }, [core.chrome]);

  const isSendFeedbackButtonDisabled =
    !selectedCsatOptionId &&
    experienceFeedbackText.trim().length === 0 &&
    generalFeedbackText.trim().length === 0;

  const handleChangeCsatOptionId = (optionId: string) => {
    setSelectedCsatOptionId(optionId);
  };

  const handleChangeExperienceFeedbackText = (feedback: string) => {
    setExperienceFeedbackText(feedback);
  };

  const handleChangeGeneralFeedbackText = (feedback: string) => {
    setGeneralFeedbackText(feedback);
  };

  const handleChangeAllowEmailContact = (allow: boolean) => {
    setAllowEmailContact(allow);
  };

  const handleChangeEmail = (emailValue: string) => {
    setEmail(emailValue);
  };

  const getSolutionType = () => {
    return cloud?.serverless?.projectType || solutionView || 'classic';
  };

  const submitFeedback = async () => {
    try {
      const eventData: FeedbackSubmittedEventData = {
        app_id: appDetails?.id || 'unknown',
        user_email: allowEmailContact && email ? email : undefined,
        allow_email_contact: allowEmailContact,
        solution: getSolutionType(),
        csat_score: Number(selectedCsatOptionId) || undefined,
        first_question: {
          id: firstQuestion?.id,
          question: firstQuestion?.question,
          answer: experienceFeedbackText.trim() || 'N/A',
        },
        second_question: {
          id: secondQuestion?.id,
          question: secondQuestion?.question,
          answer: generalFeedbackText.trim() || 'N/A',
        },
      };

      core.analytics.reportEvent(FEEDBACK_SUBMITTED_EVENT_TYPE, eventData);
    } catch (error) {
      // Silently fail
    }
  };

  const containerCss = css`
    padding: ${euiTheme.size.l};
    width: calc(600px + ${euiTheme.size.l} * 2);
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="feedbackContainer"
      css={containerCss}
    >
      <FeedbackHeader />
      <FeedbackBody
        core={core}
        experienceFeedbackText={experienceFeedbackText}
        generalFeedbackText={generalFeedbackText}
        selectedCsatOptionId={selectedCsatOptionId}
        allowEmailContact={allowEmailContact}
        questions={questions}
        appTitle={appDetails?.title}
        email={email}
        handleChangeCsatOptionId={handleChangeCsatOptionId}
        handleChangeExperienceFeedbackText={handleChangeExperienceFeedbackText}
        handleChangeGeneralFeedbackText={handleChangeGeneralFeedbackText}
        handleChangeAllowEmailContact={handleChangeAllowEmailContact}
        handleChangeEmail={handleChangeEmail}
      />
      <FeedbackFooter
        isSendFeedbackButtonDisabled={isSendFeedbackButtonDisabled}
        submitFeedback={submitFeedback}
        hideFeedbackContainer={hideFeedbackContainer}
      />
    </EuiFlexGroup>
  );
};
