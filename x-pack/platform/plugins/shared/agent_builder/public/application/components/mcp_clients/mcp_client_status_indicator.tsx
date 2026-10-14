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
import type { OAuthClient } from '@kbn/agent-builder-common';

export interface McpClientStatusValue {
  label: string;
  color: EuiHealthProps['color'];
}

export enum McpClientStatus {
  Active = 'active',
  Revoked = 'revoked',
}

export const mcpClientStatusValues: Record<McpClientStatus, McpClientStatusValue> = {
  [McpClientStatus.Active]: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.status.active', {
      defaultMessage: 'Active',
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

export const getMcpClientStatus = ({ revoked }: Pick<OAuthClient, 'revoked'>): McpClientStatus =>
  revoked ? McpClientStatus.Revoked : McpClientStatus.Active;

export interface McpClientStatusIndicatorProps {
  revoked?: boolean;
}

export const McpClientStatusIndicator = ({ revoked }: McpClientStatusIndicatorProps) => {
  const status = getMcpClientStatus({ revoked });

  if (!status) {
    return null;
  }

  return (
    <EuiHealth color={mcpClientStatusValues[status].color}>
      {mcpClientStatusValues[status].label}
    </EuiHealth>
  );
};
