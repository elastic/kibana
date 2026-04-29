/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiPopover } from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core-http-browser';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { QuickSnoozePopover } from '@kbn/response-ops-alert-snooze';
import { useCreateAlertAction } from '../../hooks/use_create_alert_action';
import { EpisodeActionButton } from './episode_action_button';
import * as i18n from './translations';

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
    (expiry: string | null) => {
      if (!groupHash) {
        return;
      }
      createAlertAction({
        groupHash,
        actionType: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        body: expiry === null ? {} : { expiry },
      });
      setIsPopoverOpen(false);
    },
    [createAlertAction, groupHash]
  );

  return isSnoozed ? (
    <EpisodeActionButton
      outlined={buttonsOutlined}
      size="s"
      color="text"
      iconType="bellSlash"
      onClick={handleUnsnooze}
      isDisabled={!groupHash}
      isLoading={isLoading}
      data-test-subj="alertEpisodeUnsnoozeActionButton"
    >
      {i18n.SNOOZE_ACTION_UNSNOOZE}
    </EpisodeActionButton>
  ) : (
    <EuiPopover
      aria-label={i18n.SNOOZE_ACTION_POPOVER_ARIA_LABEL}
      data-test-subj="alertEpisodeSnoozeActionPopover"
      display="inline-flex"
      css={css`
        align-items: center;
      `}
      button={
        <EpisodeActionButton
          outlined={buttonsOutlined}
          size="s"
          color="text"
          iconType="bell"
          onClick={togglePopover}
          isDisabled={!groupHash}
          isLoading={isLoading}
          data-test-subj="alertEpisodeSnoozeActionButton"
        >
          {i18n.SNOOZE_ACTION_SNOOZE}
        </EpisodeActionButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      panelStyle={{ width: 400 }}
    >
      <QuickSnoozePopover
        onApplySnooze={handleApplySnooze}
        data-test-subj="alertEpisodeSnoozeForm"
      />
    </EuiPopover>
  );
}
