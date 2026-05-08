/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { OAuthClientLogo } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';

export interface McpClientLogoProps {
  clientLogo?: OAuthClientLogo;
}

export const McpClientLogo = ({ clientLogo }: McpClientLogoProps) => {
  if (!clientLogo) {
    return null;
  }

  const { media_type, data } = clientLogo;
  const imageUrl = `data:${media_type};base64,${data}`;
  return (
    <EuiIcon
      type={imageUrl}
      size="m"
      title={i18n.translate('xpack.agentBuilder.mcpClients.logoTitle', {
        defaultMessage: 'MCP client logo',
      })}
    />
  );
};
