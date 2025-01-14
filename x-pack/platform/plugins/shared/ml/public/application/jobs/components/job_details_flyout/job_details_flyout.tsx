/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useJobDetailFlyout } from './job_details_flyout_context';

export const JobDetailsFlyout = () => {
  const {
    isFlyoutOpen,
    setIsFlyoutOpen,
    activeJobId: jobId,
    setActiveJobId,
  } = useJobDetailFlyout();
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'jobDetailsFlyout',
  });
  if (!jobId) {
    return null;
  }

  return isFlyoutOpen ? (
    <EuiFlyout
      data-test-subj="jobDetailsFlyout"
      type="overlay"
      size="m"
      ownFocus={false}
      onClose={() => {
        setIsFlyoutOpen(false);
        setActiveJobId(null);
      }}
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder data-test-subj={`jobDetailsFlyout-${jobId}`}>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{jobId}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>Job details</p>
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : null;
};
