/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiListGroupItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface DeactivateActionButtonProps {
  lastDeactivateAction?: string | null;
}

export function DeactivateActionButton({ lastDeactivateAction }: DeactivateActionButtonProps) {
  const isDeactivated = lastDeactivateAction === 'deactivate';

  const label = isDeactivated
    ? i18n.translate('xpack.alertingV2.episodesUi.deactivateAction.activate', {
        defaultMessage: 'Activate',
      })
    : i18n.translate('xpack.alertingV2.episodesUi.deactivateAction.deactivate', {
        defaultMessage: 'Deactivate',
      });

  const iconType = isDeactivated ? 'check' : 'cross';

  return (
    <EuiListGroupItem
      label={label}
      size="s"
      iconType={iconType}
      onClick={() => {}}
      data-test-subj="alertingEpisodeActionsDeactivateActionButton"
    />
  );
}
