/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiHealthProps } from '@elastic/eui';
import { EuiHealth } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { OAuthClient, OAuthClientConnectionsSummary } from '@kbn/agent-builder-common';

export interface McpClientStatusValue {
  label: string;
  color: EuiHealthProps['color'];
}

export enum McpClientStatus {
  Connected = 'connected',
  Revoked = 'revoked',
}

export const mcpClientStatusValues: Record<McpClientStatus, McpClientStatusValue> = {
  [McpClientStatus.Connected]: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.status.connected', {
      defaultMessage: 'Connected',
    }),
    color: 'success',
  },
  [McpClientStatus.Revoked]: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.status.revoked', {
      defaultMessage: 'Revoked',
    }),
    color: 'danger',
  },
};

export const getMcpClientStatus = ({
  revoked,
  connections,
}: Pick<OAuthClient, 'revoked' | 'connections'>): McpClientStatus | null => {
  if (revoked) {
    return McpClientStatus.Revoked;
  }
  if (connections?.active && connections.active.length > 0) {
    return McpClientStatus.Connected;
  }
  return null;
};

export interface McpClientStatusIndicatorProps {
  revoked?: boolean;
  connections?: OAuthClientConnectionsSummary;
}

export const McpClientStatusIndicator = ({
  revoked,
  connections,
}: McpClientStatusIndicatorProps) => {
  const status = getMcpClientStatus({ revoked, connections });

  if (!status) {
    return null;
  }

  return (
    <EuiHealth color={mcpClientStatusValues[status].color}>
      {mcpClientStatusValues[status].label}
    </EuiHealth>
  );
};
