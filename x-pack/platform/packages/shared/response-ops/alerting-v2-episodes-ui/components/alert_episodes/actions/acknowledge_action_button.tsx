/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import { useCreateAlertAction } from '../../../hooks/use_create_alert_action';

export interface AcknowledgeActionButtonProps {
  lastAckAction?: string | null;
  episodeId?: string;
  groupHash?: string | null;
  http: HttpStart;
}

export function AcknowledgeActionButton({
  lastAckAction,
  episodeId,
  groupHash,
  http,
}: AcknowledgeActionButtonProps) {
  const isAcknowledged = lastAckAction === 'ack';
  const actionType = isAcknowledged ? 'unack' : 'ack';
  const createAlertActionMutation = useCreateAlertAction(http);

  const label = isAcknowledged
    ? i18n.translate('xpack.alertingV2.episodesUi.acknowledgeAction.unacknowledge', {
        defaultMessage: 'Unacknowledge',
      })
    : i18n.translate('xpack.alertingV2.episodesUi.acknowledgeAction.acknowledge', {
        defaultMessage: 'Acknowledge',
      });

  return (
    <EuiButton
      size="s"
      color="text"
      fill={false}
      iconType={isAcknowledged ? 'crossCircle' : 'checkCircle'}
      onClick={() => {
        if (!episodeId || !groupHash) {
          return;
        }
        createAlertActionMutation.mutate({
          groupHash,
          actionType,
          body: { episode_id: episodeId },
        });
      }}
      isLoading={createAlertActionMutation.isLoading}
      isDisabled={!episodeId || !groupHash}
      data-test-subj="alertEpisodeAcknowledgeActionButton"
    >
      {label}
    </EuiButton>
  );
}
