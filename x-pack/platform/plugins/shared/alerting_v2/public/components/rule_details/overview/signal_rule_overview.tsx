/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Overview shown for `signal` rules. Signal rules perform stateless detection
 * and do not track episodes, so the alert activity timeline is replaced with an
 * empty state. The metadata / runbook sidebar remains in place alongside it.
 */
export const SignalRuleOverview: React.FC = () => (
  <EuiEmptyPrompt
    data-test-subj="signalRuleOverviewEmptyState"
    iconType="visBarVerticalStacked"
    title={
      <h4>
        {i18n.translate('xpack.alertingV2.ruleDetails.signalOverview.title', {
          defaultMessage: 'Activity timeline for signal rules coming soon',
        })}
      </h4>
    }
    titleSize="xs"
    color="subdued"
  />
);
