/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface DeactivateActionButtonProps {
  lastDeactivateAction: string | null;
}

export function DeactivateActionButton({ lastDeactivateAction }: DeactivateActionButtonProps) {
  const isDeactivated = lastDeactivateAction === 'deactivate';

  const label = isDeactivated
    ? i18n.translate('xpack.alertingV2.episodesUi.deactivateAction.deactivated', {
        defaultMessage: 'Deactivated',
      })
    : i18n.translate('xpack.alertingV2.episodesUi.deactivateAction.active', {
        defaultMessage: 'Active',
      });

  return (
    <EuiBadge
      color={isDeactivated ? 'default' : 'success'}
      onClick={() => {}}
      onClickAriaLabel={label}
      data-test-subj="alertingEpisodeDeactivateActionButton"
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{label}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="arrowDown" size="s" aria-hidden={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
}
