/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiListGroupItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { useCreateAlertAction } from '../../../hooks/use_create_alert_action';

export interface ResolveActionButtonProps {
  lastDeactivateAction?: string | null;
  groupHash?: string | null;
  http: HttpStart;
}

export function ResolveActionButton({
  lastDeactivateAction,
  groupHash,
  http,
}: ResolveActionButtonProps) {
  const isDeactivated = lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE;
  const actionType = isDeactivated
    ? ALERT_EPISODE_ACTION_TYPE.ACTIVATE
    : ALERT_EPISODE_ACTION_TYPE.DEACTIVATE;
  const { mutate: createAlertAction } = useCreateAlertAction(http);

  const label = isDeactivated
    ? i18n.translate('xpack.alertingV2.episodesUi.resolveAction.activate', {
        defaultMessage: 'Unresolve',
      })
    : i18n.translate('xpack.alertingV2.episodesUi.resolveAction.deactivate', {
        defaultMessage: 'Resolve',
      });

  const iconType = isDeactivated ? 'check' : 'cross';

  const handleClick = useCallback(() => {
    if (!groupHash) {
      return;
    }
    createAlertAction({
      groupHash,
      actionType,
      body: {
        reason: i18n.translate('xpack.alertingV2.episodesUi.resolveAction.reason', {
          defaultMessage: 'Updated from episodes actions UI',
        }),
      },
    });
  }, [createAlertAction, groupHash, actionType]);

  return (
    <EuiListGroupItem
      label={label}
      size="s"
      iconType={iconType}
      onClick={handleClick}
      isDisabled={!groupHash}
      data-test-subj="alertingEpisodeActionsResolveActionButton"
    />
  );
}
