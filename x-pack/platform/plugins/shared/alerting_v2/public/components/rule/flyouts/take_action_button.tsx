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
  isOpen: boolean;
  onClick: () => void;
}

/** Footer "Take action" trigger. The arrow points toward where the menu opens: up when closed
 * (the menu opens upward), down when open (clicking again collapses it). */
export const TakeActionButton = ({ isOpen, onClick }: TakeActionButtonProps) => (
  <EuiButton
    fill
    iconType={isOpen ? 'arrowDown' : 'arrowUp'}
    iconSide="right"
    onClick={onClick}
    data-test-subj="ruleSummaryFlyoutTakeActionButton"
  >
    <FormattedMessage id="xpack.alertingV2.ruleSummaryFlyout.takeAction" defaultMessage="Take action" />
  </EuiButton>
);
