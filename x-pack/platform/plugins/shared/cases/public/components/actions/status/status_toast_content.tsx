/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import * as i18n from './translations';

export const StatusToastContent = ({
  summary,
  onSeeAlertsClick,
}: {
  summary: string;
  onSeeAlertsClick: () => void;
}) => (
  <>
    <EuiText size="s" data-test-subj="cases-status-close-sync-summary">
      {summary}
    </EuiText>
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          onClick={onSeeAlertsClick}
          data-test-subj="cases-status-close-sync-see-alerts"
        >
          {i18n.SEE_ALERTS}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
StatusToastContent.displayName = 'StatusToastContent';
