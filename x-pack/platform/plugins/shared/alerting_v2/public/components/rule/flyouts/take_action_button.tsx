/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export interface TakeActionButtonProps {
  onClick: () => void;
}

export const TakeActionButton = ({ onClick }: TakeActionButtonProps) => (
  <EuiButton
    fill
    iconType="chevronSingleDown"
    iconSide="right"
    onClick={onClick}
    data-test-subj="ruleSummaryFlyoutTakeActionButton"
  >
    <FormattedMessage
      id="xpack.alertingV2.ruleSummaryFlyout.takeAction"
      defaultMessage="Take action"
    />
  </EuiButton>
);
