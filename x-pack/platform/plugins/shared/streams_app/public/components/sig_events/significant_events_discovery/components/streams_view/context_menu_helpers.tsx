/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InferenceConnector } from '@kbn/inference-common';
import React from 'react';
import { ConnectorIcon } from '../../../../connector_list_button/connector_icon';
import { MODEL_SETTINGS_LABEL } from './translations';

export function buildModelSettingsMenuItems(
  managementUrl: string | undefined,
  onClose: () => void
) {
  if (!managementUrl) return [];
  return [
    { isSeparator: true as const },
    {
      name: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>{MODEL_SETTINGS_LABEL}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="popout" size="s" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      icon: 'gear' as const,
      onClick: () => {
        window.open(managementUrl, '_blank', 'noreferrer');
        onClose();
      },
    },
  ];
}

export function buildConnectorMenuItem(
  connector: InferenceConnector | undefined,
  panelId: number
): { name: React.ReactNode; panel: number } {
  return {
    name: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <ConnectorIcon connectorName={connector?.name} />
        </EuiFlexItem>
        <EuiFlexItem className="eui-textTruncate" css={{ minWidth: 0 }}>
          {i18n.translate(
            'xpack.streams.significantEventsDiscovery.streamsView.connectorMenuItemModel',
            {
              defaultMessage: 'Model {name}',
              values: { name: connector?.name ?? '—' },
            }
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    panel: panelId,
  };
}
