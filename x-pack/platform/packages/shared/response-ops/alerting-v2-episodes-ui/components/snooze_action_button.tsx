/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface SnoozeActionButtonProps {
  lastSnoozeAction: string | null;
}

export function SnoozeActionButton({ lastSnoozeAction }: SnoozeActionButtonProps) {
  const isSnoozed = lastSnoozeAction === 'snooze';

  return isSnoozed ? (
    <EuiButtonIcon
      iconType="bellSlash"
      color="accent"
      aria-label={i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.snoozedAriaLabel', {
        defaultMessage: 'Snoozed',
      })}
      onClick={() => {}}
      data-test-subj="alertingEpisodeSnoozeActionButton"
    />
  ) : (
    <EuiButtonIcon
      iconType="bell"
      aria-label={i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.snoozeAriaLabel', {
        defaultMessage: 'Snooze',
      })}
      onClick={() => {}}
      data-test-subj="alertingEpisodeSnoozeActionButton"
    />
  );
}
