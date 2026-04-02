/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeSnoozeForm } from './snooze_form';
import { useCreateAlertAction } from '../../hooks/use_create_alert_action';

const unsnoozeLabel = i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.unsnooze', {
  defaultMessage: 'Unsnooze',
});
const snoozeLabel = i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.snooze', {
  defaultMessage: 'Snooze',
});

export interface AlertEpisodeSnoozeActionButtonProps {
  lastSnoozeAction?: string | null;
  groupHash?: string | null;
  http: HttpStart;
  buttonsOutlined?: boolean;
}

export function AlertEpisodeSnoozeActionButton({
  lastSnoozeAction,
  groupHash,
  http,
  buttonsOutlined = true,
}: AlertEpisodeSnoozeActionButtonProps) {
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

  const unsnoozeButtonProps = {
    size: 's' as const,
    color: 'text' as const,
    iconType: 'bellSlash' as const,
    onClick: handleUnsnooze,
    isDisabled: !groupHash,
    isLoading,
    'data-test-subj': 'alertEpisodeUnsnoozeActionButton',
    children: unsnoozeLabel,
  };

  const snoozeTriggerButtonProps = {
    size: 's' as const,
    color: 'text' as const,
    iconType: 'bell' as const,
    onClick: togglePopover,
    isDisabled: !groupHash,
    isLoading,
    'data-test-subj': 'alertEpisodeSnoozeActionButton',
    children: snoozeLabel,
  };

  return isSnoozed ? (
    buttonsOutlined ? (
      <EuiButton {...unsnoozeButtonProps} fill={false} />
    ) : (
      <EuiButtonEmpty {...unsnoozeButtonProps} />
    )
  ) : (
    <EuiPopover
      aria-label={i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.popoverAriaLabel', {
        defaultMessage: 'Snooze actions',
      })}
      data-test-subj="alertEpisodeSnoozeActionPopover"
      display="inline-flex"
      css={css`
        align-items: center;
      `}
      button={
        buttonsOutlined ? (
          <EuiButton {...snoozeTriggerButtonProps} fill={false} />
        ) : (
          <EuiButtonEmpty {...snoozeTriggerButtonProps} />
        )
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
