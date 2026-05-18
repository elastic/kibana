/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { McpClientsTable } from './mcp_clients_table';
import { labels } from '../../utils/i18n';

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  border-style: none;
`;

export const AgentBuilderMcpClients = () => {
  return (
    <KibanaPageTemplate data-test-subj="agentBuilderMcpClientsListPage">
      <KibanaPageTemplate.Header
        css={headerStyles}
        pageTitle={labels.tools.mcpClients.title}
        description={labels.tools.mcpClients.description}
      />
      <KibanaPageTemplate.Section>
        <McpClientsTable />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
