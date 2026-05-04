/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonLoading, EuiSkeletonText, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { OAuthClient } from '@kbn/agent-builder-common';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { labels } from '../../utils/i18n';

const loadingSkeletonTextStyles = css`
  display: inline-block;
  width: 200px;
`;

const headerTextStyles = css`
  min-height: 24px;
`;

export interface McpClientsTableHeaderProps {
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  clients: OAuthClient[];
  total: number;
}

export const McpClientsTableHeader = ({
  isLoading,
  pageIndex,
  pageSize,
  clients,
  total,
}: McpClientsTableHeaderProps) => {
  return (
    <EuiSkeletonLoading
      isLoading={isLoading}
      loadingContent={<EuiSkeletonText css={loadingSkeletonTextStyles} lines={1} size="xs" />}
      loadedContent={
        <EuiText size="xs" css={headerTextStyles}>
          <FormattedMessage
            id="xpack.agentBuilder.mcpClients.mcpClientsTableSummary"
            defaultMessage="Showing {start}-{end} of {total} {mcpClients}"
            values={{
              start: <strong>{Math.min(pageIndex * pageSize + 1, clients.length)}</strong>,
              end: <strong>{Math.min((pageIndex + 1) * pageSize, clients.length)}</strong>,
              total,
              mcpClients: <strong>{labels.tools.mcpClients.mcpClientsLabel}</strong>,
            }}
          />
        </EuiText>
      }
    />
  );
};
