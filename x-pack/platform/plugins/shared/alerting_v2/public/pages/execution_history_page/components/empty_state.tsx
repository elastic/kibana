/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const PoliciesEmptyState = () => (
  <EuiEmptyPrompt
    data-test-subj="executionHistoryEmptyPrompt"
    iconType="clock"
    title={
      <h2>
        <FormattedMessage
          id="xpack.alertingV2.executionHistory.emptyTitle"
          defaultMessage="No policy execution activity in the last 24 hours."
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.alertingV2.executionHistory.emptyBody"
          defaultMessage="Summary events appear here after the dispatcher evaluates episodes against a policy."
        />
      </p>
    }
  />
);

export const RulesPlaceholder = () => (
  <EuiEmptyPrompt
    iconType="visGauge"
    title={
      <h2>
        <FormattedMessage
          id="xpack.alertingV2.executionHistory.rulesTab.placeholderTitle"
          defaultMessage="Rules execution history is not available yet."
        />
      </h2>
    }
  />
);
