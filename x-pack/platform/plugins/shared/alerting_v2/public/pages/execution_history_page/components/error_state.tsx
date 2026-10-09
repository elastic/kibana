/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  onRetry: () => void;
}

export const ExecutionHistoryErrorState = ({ onRetry }: Props) => (
  <EuiCallOut
    announceOnMount
    color="danger"
    iconType="error"
    title={
      <FormattedMessage
        id="xpack.alertingV2.executionHistory.errorTitle"
        defaultMessage="Failed to load execution history."
      />
    }
  >
    <EuiButton color="danger" onClick={onRetry} data-test-subj="executionHistoryRetryButton">
      <FormattedMessage id="xpack.alertingV2.executionHistory.retryButton" defaultMessage="Retry" />
    </EuiButton>
  </EuiCallOut>
);
