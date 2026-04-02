/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeSnoozeForm } from './alert_episode_snooze_form';
import { useCreateAlertAction } from '../../../hooks/use_create_alert_action';

export function SnoozeActionButton({
  lastSnoozeAction,
  groupHash,
  http,
}: {
  lastSnoozeAction?: string | null;
  groupHash?: string | null;
  http: HttpStart;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isSnoozed = lastSnoozeAction === ALERT_EPISODE_ACTION_TYPE.SNOOZE;
  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);
  const { mutate: createAlertAction, isLoading } = useCreateAlertAction(http);

  const handleUnsnooze = useCallback(() => {
    if (!groupHash) {
      return;
    }
    createAlertAction({
      groupHash,
      actionType: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
    });
  }, [createAlertAction, groupHash]);

  const handleApplySnooze = useCallback(
    (expiry: string) => {
      if (!groupHash) {
        return;
      }
      createAlertAction({
        groupHash,
        actionType: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        body: { expiry },
      });
      setIsPopoverOpen(false);
    },
    [createAlertAction, groupHash]
  );

  return isSnoozed ? (
    <EuiButton
      size="s"
      color="text"
      fill={false}
      iconType="bellSlash"
      onClick={handleUnsnooze}
      isDisabled={!groupHash}
      isLoading={isLoading}
      data-test-subj="alertEpisodeUnsnoozeActionButton"
    >
      {i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.unsnooze', {
        defaultMessage: 'Unsnooze',
      })}
    </EuiButton>
  ) : (
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
          iconType={'bell'}
          onClick={togglePopover}
          isDisabled={!groupHash}
          isLoading={isLoading}
          data-test-subj="alertEpisodeSnoozeActionButton"
        >
          {i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.snooze', {
            defaultMessage: 'Snooze',
          })}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize="m"
      panelStyle={{ width: 320 }}
    >
      <AlertEpisodeSnoozeForm onApplySnooze={handleApplySnooze} />
    </EuiPopover>
  );
}
