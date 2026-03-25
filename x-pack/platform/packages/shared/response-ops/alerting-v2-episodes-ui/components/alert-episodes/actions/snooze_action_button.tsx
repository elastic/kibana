/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface SnoozeActionButtonProps {
  lastSnoozeAction?: string | null;
}

export function SnoozeActionButton({ lastSnoozeAction }: SnoozeActionButtonProps) {
  const isSnoozed = lastSnoozeAction === 'snooze';

  const label = isSnoozed
    ? i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.unsnooze', {
        defaultMessage: 'Unsnooze',
      })
    : i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.snooze', {
        defaultMessage: 'Snooze',
      });

  return (
    <EuiButton
      size="s"
      color="text"
      fill={false}
      iconType={isSnoozed ? 'bell' : 'bellSlash'}
      onClick={() => {}}
      data-test-subj="alertEpisodeSnoozeActionButton"
    >
      {label}
    </EuiButton>
  );
}
