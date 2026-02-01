/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { FeedbackHeader } from './header';
import { FeedbackBody } from './body/feedback_body';
import { FeedbackFooter } from './footer/feedback_footer';

interface Props {
  core: CoreStart;
  hideFeedbackContainer: () => void;
}

export const FeedbackContainer = ({ core, hideFeedbackContainer }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [experienceFeedbackText, setExperienceFeedbackText] = useState('');
  const [generalFeedbackText, setGeneralFeedbackText] = useState('');
  const [selectedCsatOptionId, setSelectedCsatOptionId] = useState('');
  const [allowEmailContact, setAllowEmailContact] = useState(false);
  const [email, setEmail] = useState('');

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

  const submitFeedback = async () => {
    // TODO: Send to EBT
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
