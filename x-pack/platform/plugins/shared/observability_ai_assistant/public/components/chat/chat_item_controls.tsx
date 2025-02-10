/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import { Feedback, FeedbackButtons } from '../buttons/feedback_buttons';
import { StopGeneratingButton } from '../buttons/stop_generating_button';
import { RegenerateResponseButton } from '../buttons/regenerate_response_button';

const containerClassName = css`
  padding-top: 4px;
  padding-bottom: 4px;
`;

export function ChatItemControls({
  error,
  loading,
  canRegenerate,
  canGiveFeedback,
  onFeedbackClick,
  onRegenerateClick,
  onStopGeneratingClick,
}: {
  error: any;
  loading: boolean;
  canRegenerate: boolean;
  canGiveFeedback: boolean;
  onFeedbackClick: (feedback: Feedback) => void;
  onRegenerateClick: () => void;
  onStopGeneratingClick: () => void;
}) {
  const displayFeedback = !error && canGiveFeedback;
  const displayRegenerate = !loading && canRegenerate;

  let controls;

  if (loading) {
    controls = <StopGeneratingButton onClick={onStopGeneratingClick} />;
  } else if (displayFeedback || displayRegenerate) {
    controls = (
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        {displayFeedback ? (
          <EuiFlexItem grow={true}>
            <FeedbackButtons onClickFeedback={onFeedbackClick} />
          </EuiFlexItem>
        ) : null}
        {displayRegenerate ? (
          <EuiFlexItem grow={false}>
            <RegenerateResponseButton onClick={onRegenerateClick} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  } else {
    controls = null;
  }

  return controls ? (
    <>
      <EuiHorizontalRule margin="none" />
      <EuiPanel hasShadow={false} paddingSize="s" className={containerClassName}>
        {controls}
      </EuiPanel>
    </>
  ) : null;
}
