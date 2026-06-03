/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FIND_SIGNIFICANT_EVENTS_LABEL } from '../shared/translations';

interface FindSignificantEventsButtonProps {
  onRun: () => void;
  onCancel: () => void;
  isRunning: boolean;
  isDisabled: boolean;
}

export const FindSignificantEventsButton = ({
  onRun,
  onCancel,
  isRunning,
  isDisabled,
}: FindSignificantEventsButtonProps) => {
  if (isRunning) {
    return (
      <EuiButton
        iconType="stop"
        onClick={onCancel}
        color="warning"
        data-test-subj="significant_events_cancel_discovery_button"
      >
        {i18n.translate('xpack.streams.significantEventsDiscovery.cancelLabel', {
          defaultMessage: 'Cancel discovery',
        })}
      </EuiButton>
    );
  }

  return (
    <EuiButton
      iconType="sparkles"
      onClick={onRun}
      isDisabled={isDisabled}
      color="text"
      data-test-subj="significant_events_discover_insights_button"
    >
      {FIND_SIGNIFICANT_EVENTS_LABEL}
    </EuiButton>
  );
};
