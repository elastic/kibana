/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const FeedbackHeader = () => (
  <EuiFlexItem grow={false} data-test-subj="feedbackHeader">
    <EuiTitle size="l">
      <h2>
        <FormattedMessage id="feedback.header.title" defaultMessage="Feedback" />
      </h2>
    </EuiTitle>
  </EuiFlexItem>
);
