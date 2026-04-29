/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiHealth, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';

import { SNIFF_MODE } from '../../../../../../common/constants';
import type { RemoteCluster } from '../../../../store/types';

interface Props {
  isConnected?: boolean;
  mode?: RemoteCluster['mode'];
}

export function ConnectionStatus({ isConnected, mode }: Props) {
  const seedNodeTooltip = i18n.translate(
    'xpack.remoteClusters.connectedStatus.notConnectedToolTip',
    {
      defaultMessage: `Ensure the seed nodes are configured with the remote cluster's transport port, not the http port.`,
    }
  );

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiHealth
          color={isConnected ? 'success' : 'danger'}
          data-test-subj="remoteClusterConnectionStatusMessage"
        >
          {isConnected
            ? i18n.translate('xpack.remoteClusters.connectedStatus.connectedAriaLabel', {
                defaultMessage: 'Connected',
              })
            : i18n.translate('xpack.remoteClusters.connectedStatus.notConnectedAriaLabel', {
                defaultMessage: 'Not connected',
              })}
        </EuiHealth>
      </EuiFlexItem>

      {!isConnected && mode === SNIFF_MODE && (
        <EuiFlexItem grow={false}>
          <EuiIconTip color="subdued" content={seedNodeTooltip} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
