/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ToolType } from '@kbn/onechat-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { useToolsActions } from '../../context/tools_table_provider';
import { labels } from '../../utils/i18n';
import { OnechatToolsTable } from './table/tools_table';
import { McpConnectionButton } from './mcp_server/mcp_connection_button';
export const OnechatTools = () => {
  const { euiTheme } = useEuiTheme();
  const { createTool } = useToolsActions();

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={labels.tools.title}
        description={labels.tools.description}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          <EuiButton
            key="new-esql-tool-button"
            fill
            iconType="plusInCircleFilled"
            onClick={() => createTool(ToolType.esql)}
          >
            <EuiText size="s">{labels.tools.newToolButton}</EuiText>
          </EuiButton>,
          <McpConnectionButton key="mcp-server-connection-button" />,
        ]}
      />
      <KibanaPageTemplate.Section>
        <OnechatToolsTable />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
