/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiIconTip, EuiLoadingSpinner } from '@elastic/eui';

import { SNAPSHOT_STATE } from '../../../../../constants';
import { useAppDependencies } from '../../../../../index';

interface Props {
  state: any;
}

export const SnapshotState: React.FC<Props> = ({ state }) => {
  const {
    core: { i18n },
  } = useAppDependencies();

  const stateMap: any = {
    [SNAPSHOT_STATE.IN_PROGRESS]: {
      icon: <EuiLoadingSpinner size="m" />,
      label: i18n.translate('xpack.snapshotRestore.snapshotState.inProgressLabel', {
        defaultMessage: 'Taking snapshot…',
      }),
    },
    [SNAPSHOT_STATE.SUCCESS]: {
      icon: <EuiIcon color="success" type="check" />,
      label: i18n.translate('xpack.snapshotRestore.snapshotState.completeLabel', {
        defaultMessage: 'Snapshot complete',
      }),
    },
    [SNAPSHOT_STATE.FAILED]: {
      icon: <EuiIcon color="danger" type="cross" />,
      label: i18n.translate('xpack.snapshotRestore.snapshotState.failedLabel', {
        defaultMessage: 'Snapshot failed',
      }),
    },
    [SNAPSHOT_STATE.PARTIAL]: {
      icon: <EuiIcon color="warning" type="alert" />,
      label: i18n.translate('xpack.snapshotRestore.snapshotState.partialLabel', {
        defaultMessage: 'Partial failure',
      }),
      tip: i18n.translate('xpack.snapshotRestore.snapshotState.partialTipDescription', {
        defaultMessage: `Global cluster state was stored, but at least one shard wasn't stored successfully. See the 'Failed indices' tab.`,
      }),
    },
    [SNAPSHOT_STATE.INCOMPATIBLE]: {
      icon: <EuiIcon color="warning" type="alert" />,
      label: i18n.translate('xpack.snapshotRestore.snapshotState.incompatibleLabel', {
        defaultMessage: 'Incompatible version',
      }),
      tip: i18n.translate('xpack.snapshotRestore.snapshotState.incompatibleTipDescription', {
        defaultMessage: `Snapshot was created with a version of Elasticsearch incompatible with the cluster's version.`,
      }),
    },
  };

  if (!stateMap[state]) {
    // Help debug unexpected state.
    return state;
  }

  const { icon, label, tip } = stateMap[state];

  const iconTip = tip && (
    <Fragment>
      {' '}
      <EuiIconTip content={tip} />
    </Fragment>
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{icon}</EuiFlexItem>

      <EuiFlexItem grow={false}>
        {/* Escape flex layout created by EuiFlexItem. */}
        <div>
          {label}
          {iconTip}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
