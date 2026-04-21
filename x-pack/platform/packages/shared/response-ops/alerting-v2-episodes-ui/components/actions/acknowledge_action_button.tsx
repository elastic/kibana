/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { useCreateAlertAction } from '../../hooks/use_create_alert_action';
import { EpisodeActionButton } from './episode_action_button';
import * as i18n from './translations';

export interface AlertEpisodeAcknowledgeActionButtonProps {
  lastAckAction?: string | null;
  episodeId?: string;
  groupHash?: string | null;
  http: HttpStart;
  buttonsOutlined?: boolean;
}

export function AlertEpisodeAcknowledgeActionButton({
  lastAckAction,
  episodeId,
  groupHash,
  http,
  buttonsOutlined = true,
}: AlertEpisodeAcknowledgeActionButtonProps) {
  const isAcknowledged = lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK;
  const actionType = isAcknowledged
    ? ALERT_EPISODE_ACTION_TYPE.UNACK
    : ALERT_EPISODE_ACTION_TYPE.ACK;
  const { mutate: createAlertAction, isLoading } = useCreateAlertAction(http);

  const label = isAcknowledged
    ? i18n.ACKNOWLEDGE_ACTION_UNACKNOWLEDGE
    : i18n.ACKNOWLEDGE_ACTION_ACKNOWLEDGE;

  const handleClick = useCallback(() => {
    if (!episodeId || !groupHash) {
      return;
    }
    createAlertAction({
      groupHash,
      actionType,
      body: { episode_id: episodeId },
    });
  }, [createAlertAction, episodeId, groupHash, actionType]);

  return (
    <EpisodeActionButton
      outlined={buttonsOutlined}
      size="s"
      color="text"
      iconType={isAcknowledged ? 'crossCircle' : 'checkCircle'}
      onClick={handleClick}
      isLoading={isLoading}
      isDisabled={!episodeId || !groupHash}
      data-test-subj="alertEpisodeAcknowledgeActionButton"
    >
      {label}
    </EpisodeActionButton>
  );
}
