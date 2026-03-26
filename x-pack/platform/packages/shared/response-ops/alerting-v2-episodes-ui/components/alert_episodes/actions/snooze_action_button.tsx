/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import { AlertEpisodeSnoozeForm } from './alert_episode_snooze_form';
import { useCreateAlertAction } from '../../../hooks/use_create_alert_action';

export interface SnoozeActionButtonProps {
  lastSnoozeAction?: string | null;
  groupHash?: string | null;
  http: HttpStart;
}

export function SnoozeActionButton({
  lastSnoozeAction,
  groupHash,
  http,
}: SnoozeActionButtonProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isSnoozed = lastSnoozeAction === 'snooze';
  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);
  const createAlertActionMutation = useCreateAlertAction(http);

  const label = isSnoozed
    ? i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.unsnooze', {
        defaultMessage: 'Unsnooze',
      })
    : i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.snooze', {
        defaultMessage: 'Snooze',
      });

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.popoverAriaLabel', {
        defaultMessage: 'Snooze actions',
      })}
      data-test-subj="alertEpisodeSnoozeActionPopover"
      button={
        <EuiButton
          size="s"
          color="text"
          fill={false}
          iconType={isSnoozed ? 'bell' : 'bellSlash'}
          onClick={togglePopover}
          isDisabled={!groupHash}
          isLoading={createAlertActionMutation.isLoading}
          data-test-subj="alertEpisodeSnoozeActionButton"
        >
          {label}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize="m"
      panelStyle={{ width: 320 }}
    >
      <AlertEpisodeSnoozeForm
        isSnoozed={isSnoozed}
        onApplySnooze={(expiry) => {
          if (!groupHash) {
            return;
          }
          createAlertActionMutation.mutate({
            groupHash,
            actionType: 'snooze',
            body: { expiry },
          });
          closePopover();
        }}
        onCancelSnooze={() => {
          if (!groupHash) {
            return;
          }
          createAlertActionMutation.mutate({
            groupHash,
            actionType: 'unsnooze',
            body: {},
          });
          closePopover();
        }}
      />
    </EuiPopover>
  );
}
