/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiCallOut,
  EuiCheckbox,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { CONNECTOR_ID as MCP_CONNECTOR_TYPE } from '@kbn/connector-schemas/mcp/constants';
import type { McpGatewayConnectorConfig } from '@kbn/agent-builder-common';
import { labels } from '../../utils/i18n';
import {
  useMcpGatewayConfig,
  useUpdateMcpGatewayConfig,
} from '../../hooks/tools/use_mcp_gateway_config';
import { useListConnectors } from '../../hooks/tools/use_mcp_connectors';
import type { ConnectorItem } from '../../../../common/http_api/tools';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

interface ConnectorRow {
  connectorId: string;
  connectorName: string;
  connectorSlug: string;
  enabled: boolean;
}

function buildConnectorRows(
  connectors: readonly ConnectorItem[],
  gatewayConnectors: McpGatewayConnectorConfig[]
): ConnectorRow[] {
  return connectors.map((connector) => {
    const existing = gatewayConnectors.find((gc) => gc.connectorId === connector.id);
    return {
      connectorId: connector.id,
      connectorName: connector.name,
      connectorSlug: existing?.connectorSlug ?? slugify(connector.name),
      enabled: existing?.enabled ?? false,
    };
  });
}

export const McpGatewayPanel: React.FC = () => {
  const { config, isLoading: isLoadingConfig } = useMcpGatewayConfig();
  const { updateConfig, isUpdating } = useUpdateMcpGatewayConfig();
  const { connectors, isLoading: isLoadingConnectors } = useListConnectors({
    type: MCP_CONNECTOR_TYPE,
  });

  const rows = useMemo(
    () => buildConnectorRows(connectors, config.connectors),
    [connectors, config.connectors]
  );

  const handleGlobalToggle = useCallback(
    (enabled: boolean) => {
      updateConfig({ ...config, enabled });
    },
    [config, updateConfig]
  );

  const handleConnectorToggle = useCallback(
    (connectorId: string, enabled: boolean) => {
      const row = rows.find((r) => r.connectorId === connectorId);
      if (!row) return;

      const existing = config.connectors.find((c) => c.connectorId === connectorId);
      const updatedConnectors: McpGatewayConnectorConfig[] = existing
        ? config.connectors.map((c) => (c.connectorId === connectorId ? { ...c, enabled } : c))
        : [...config.connectors, { connectorId, connectorSlug: row.connectorSlug, enabled }];

      updateConfig({ ...config, connectors: updatedConnectors });
    },
    [config, rows, updateConfig]
  );

  const columns: Array<EuiBasicTableColumn<ConnectorRow>> = [
    {
      field: 'connectorName',
      name: labels.mcpGateway.connectorNameColumn,
      render: (name: string) => <EuiText size="s">{name}</EuiText>,
    },
    {
      field: 'connectorSlug',
      name: labels.mcpGateway.toolPrefixColumn,
      render: (slug: string) => (
        <EuiText size="s" color="subdued">
          <code>{slug}__</code>
        </EuiText>
      ),
    },
    {
      field: 'enabled',
      name: labels.mcpGateway.enabledColumn,
      width: '80px',
      render: (enabled: boolean, row: ConnectorRow) => (
        <EuiCheckbox
          id={`mcp-gateway-connector-${row.connectorId}`}
          checked={enabled}
          onChange={(e) => handleConnectorToggle(row.connectorId, e.target.checked)}
          disabled={!config.enabled || isUpdating}
          aria-label={`Proxy ${row.connectorName}`}
        />
      ),
    },
  ];

  const isLoading = isLoadingConfig || isLoadingConnectors;

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiTitle size="s">
        <h3>{labels.mcpGateway.panelTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{labels.mcpGateway.panelDescription}</p>
      </EuiText>
      <EuiSpacer size="m" />

      {isLoading ? (
        <EuiSkeletonText lines={3} />
      ) : (
        <>
          <EuiSwitch
            label={labels.mcpGateway.enabledToggleLabel}
            checked={config.enabled}
            onChange={(e) => handleGlobalToggle(e.target.checked)}
            disabled={isUpdating}
          />

          {config.enabled && (
            <>
              <EuiSpacer size="m" />
              {connectors.length === 0 ? (
                <EuiCallOut
                  size="s"
                  iconType="iInCircle"
                  title={labels.mcpGateway.noConnectorsMessage}
                />
              ) : (
                <EuiBasicTable
                  tableCaption={labels.mcpGateway.panelTitle}
                  items={rows}
                  rowHeader="connectorName"
                  columns={columns}
                  tableLayout="auto"
                />
              )}
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};
