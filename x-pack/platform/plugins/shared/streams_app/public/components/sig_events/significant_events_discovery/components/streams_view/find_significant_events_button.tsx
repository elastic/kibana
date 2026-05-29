/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FIND_SIGNIFICANT_EVENTS_LABEL } from '../shared/translations';

interface FindSignificantEventsButtonProps {
  onRun: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const FindSignificantEventsButton = ({
  onRun,
  isLoading,
  isDisabled,
}: FindSignificantEventsButtonProps) => {
  return (
    <EuiButton
      iconType="sparkles"
      onClick={onRun}
      isLoading={isLoading}
      isDisabled={isDisabled || isLoading}
      color="text"
      data-test-subj="significant_events_discover_insights_button"
    >
      {FIND_SIGNIFICANT_EVENTS_LABEL}
    </EuiButton>
  );
};
