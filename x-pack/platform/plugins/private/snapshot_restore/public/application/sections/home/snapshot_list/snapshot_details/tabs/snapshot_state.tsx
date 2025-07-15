/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiHealth, EuiIcon, EuiToolTip } from '@elastic/eui';

import { SNAPSHOT_STATE } from '../../../../../constants';
import { useServices } from '../../../../../app_context';

interface Props {
  state: any;
  displayTooltipIcon: boolean;
}

export const SnapshotState: React.FC<Props> = ({ state, displayTooltipIcon }) => {
  const { i18n } = useServices();

  const stateMap: any = {
    [SNAPSHOT_STATE.IN_PROGRESS]: {
      color: 'primary',
      label: i18n.translate('xpack.snapshotRestore.snapshotState.inProgressLabel', {
        defaultMessage: 'In progress',
      }),
    },
    [SNAPSHOT_STATE.SUCCESS]: {
      color: 'success',
      label: i18n.translate('xpack.snapshotRestore.snapshotState.completeLabel', {
        defaultMessage: 'Complete',
      }),
    },
    [SNAPSHOT_STATE.FAILED]: {
      color: 'danger',
      label: i18n.translate('xpack.snapshotRestore.snapshotState.failedLabel', {
        defaultMessage: 'Failed',
      }),
    },
    [SNAPSHOT_STATE.PARTIAL]: {
      color: 'warning',
      label: i18n.translate('xpack.snapshotRestore.snapshotState.partialLabel', {
        defaultMessage: 'Partial',
      }),
      tip: i18n.translate('xpack.snapshotRestore.snapshotState.partialTipDescription', {
        defaultMessage: `Global cluster state was stored, but at least one shard wasn't stored successfully. See the 'Failed indices' tab.`,
      }),
    },
  };

  if (!stateMap[state]) {
    // Help debug unexpected state.
    return state;
  }

  const { color, label, tip } = stateMap[state];

  const iconTip = displayTooltipIcon && tip && <EuiIcon type="question" />;

  return (
    <EuiToolTip position="top" content={tip}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiHealth color={color}>{label}</EuiHealth>
        {iconTip}
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
