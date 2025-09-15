/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiText, EuiLink, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ToolType } from '@kbn/onechat-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useToolsActions } from '../../context/tools_provider';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { OnechatToolsTable } from './table/tools_table';
import { McpConnectionButton } from './mcp_server/mcp_connection_button';
export const OnechatTools = () => {
  const { euiTheme } = useEuiTheme();
  const { createTool } = useToolsActions();
  const { navigateToOnechatUrl } = useNavigation();

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={labels.tools.title}
        description={
          <>
            {i18n.translate('xpack.onechat.tools.toolsDescriptionPart1', {
              defaultMessage: 'Tools are modular, reusable Elasticsearch operations. ',
            })}
            <EuiLink
              onClick={() => navigateToOnechatUrl(appPaths.agents.list)}
              style={{ cursor: 'pointer' }}
            >
              {i18n.translate('xpack.onechat.tools.agentsLinkText', {
                defaultMessage: 'Agents',
              })}
            </EuiLink>
            {i18n.translate('xpack.onechat.tools.toolsDescriptionPart2', {
              defaultMessage:
                ' use them to search, retrieve, and analyze your data. Use our built-in tools for common operations, and create your own for custom use cases. ',
            })}
            <EuiLink
              href="#"
              aria-label={i18n.translate('xpack.onechat.tools.toolsDocumentationAriaLabel', {
                defaultMessage: 'Learn more about tools in the documentation',
              })}
            >
              {i18n.translate('xpack.onechat.tools.toolsDocumentation', {
                defaultMessage: 'Learn more',
              })}{' '}
              <EuiIcon type="popout" />
            </EuiLink>
          </>
        }
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
