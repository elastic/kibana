/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface AcknowledgeActionButtonProps {
  lastAckAction: string | null;
}

export function AcknowledgeActionButton({ lastAckAction }: AcknowledgeActionButtonProps) {
  const isAcknowledged = lastAckAction === 'ack';

  const label = isAcknowledged
    ? i18n.translate('xpack.alertingV2.episodesUi.acknowledgeAction.acknowledged', {
        defaultMessage: 'Acknowledged',
      })
    : i18n.translate('xpack.alertingV2.episodesUi.acknowledgeAction.unacknowledged', {
        defaultMessage: 'Unacknowledged',
      });

  return (
    <EuiBadge
      color={isAcknowledged ? 'primary' : 'accent'}
      onClick={() => {}}
      onClickAriaLabel={label}
      data-test-subj="alertingEpisodeAcknowledgeActionButton"
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{label}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
}
