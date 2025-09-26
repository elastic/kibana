/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ChangeEvent, useState, useEffect, useCallback } from 'react';
import type { CoreAuthenticationService } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FeedbackFlyoutBody, FeedbackFlyoutFooter, FeedbackFlyoutHeader } from '.';
import { FEEDBACK_TYPE } from '../constants';

interface Props {
  closeFlyout: () => void;
  getCurrentUser: CoreAuthenticationService['getCurrentUser'];
  getLicense: LicensingPluginStart['getLicense'];
}

export const FeedbackFlyout = ({ closeFlyout, getCurrentUser, getLicense }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [feedbackType, setFeedbackType] = useState(FEEDBACK_TYPE.FEATURE_REQUEST);
  const [feedbackText, setFeedbackText] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const isSendFeedbackButtonDisabled = !feedbackText.trim().length;

  const getEmail = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (_) {
      setUserEmail('');
    }
  }, [getCurrentUser]);

  useEffect(() => {
    getEmail();
  }, [getEmail]);

  const handleChangeFeedbackText = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFeedbackText(e.target.value);
  };

  const handleChangeFeedbackType = (e: ChangeEvent<HTMLSelectElement>) => {
    setFeedbackType(e.target.value as FEEDBACK_TYPE);
  };

  const handleChangeEmail = (e: ChangeEvent<HTMLInputElement>) => {
    setUserEmail(e.target.value);
  };

  const submitFeedback = () => {
    // TODO
  };

  const flyoutCss = css`
    padding: ${euiTheme.size.l};
  `;

  const dividerCss = css`
    border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    margin-left: -${euiTheme.size.l};
    margin-right: -${euiTheme.size.l};
  `;

  const Divider = () => <span css={dividerCss} aria-hidden="true" />;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="feedbackFlyout" css={flyoutCss}>
      <FeedbackFlyoutHeader closeFlyout={closeFlyout} />
      <Divider />
      <FeedbackFlyoutBody
        feedbackType={feedbackType}
        feedbackText={feedbackText}
        userEmail={userEmail}
        handleChangeFeedbackType={handleChangeFeedbackType}
        handleChangeFeedbackText={handleChangeFeedbackText}
        handleChangeEmail={handleChangeEmail}
        getLicense={getLicense}
      />
      <Divider />
      <FeedbackFlyoutFooter
        isSendFeedbackButtonDisabled={isSendFeedbackButtonDisabled}
        submitFeedback={submitFeedback}
      />
    </EuiFlexGroup>
  );
};
