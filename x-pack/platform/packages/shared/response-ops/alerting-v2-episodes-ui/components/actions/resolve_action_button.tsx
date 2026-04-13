/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiListGroupItem } from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { useCreateAlertAction } from '../../hooks/use_create_alert_action';
import * as i18n from './translations';

export interface AlertEpisodeResolveActionButtonProps {
  lastDeactivateAction?: string | null;
  groupHash?: string | null;
  http: HttpStart;
}

export function AlertEpisodeResolveActionButton({
  lastDeactivateAction,
  groupHash,
  http,
}: AlertEpisodeResolveActionButtonProps) {
  const isDeactivated = lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE;
  const actionType = isDeactivated
    ? ALERT_EPISODE_ACTION_TYPE.ACTIVATE
    : ALERT_EPISODE_ACTION_TYPE.DEACTIVATE;
  const { mutate: createAlertAction } = useCreateAlertAction(http);

  const label = isDeactivated ? i18n.RESOLVE_ACTION_ACTIVATE : i18n.RESOLVE_ACTION_DEACTIVATE;

  const iconType = isDeactivated ? 'check' : 'cross';

  const handleClick = useCallback(() => {
    if (!groupHash) {
      return;
    }
    createAlertAction({
      groupHash,
      actionType,
      body: {
        reason: i18n.RESOLVE_ACTION_REASON,
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
