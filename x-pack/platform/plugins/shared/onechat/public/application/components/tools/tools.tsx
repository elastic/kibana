/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiText, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ToolType } from '@kbn/onechat-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { docLinks } from '../../../../common/doc_links';
import { useToolsActions } from '../../context/tools_provider';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { OnechatToolsTable } from './table/tools_table';
import { McpConnectionButton } from './mcp_server/mcp_connection_button';
import { TechPreviewTitle } from '../common/tech_preview';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';
export const OnechatTools = () => {
  const { euiTheme } = useEuiTheme();
  const { createTool } = useToolsActions();
  const { createOnechatUrl } = useNavigation();

  const { manageTools } = useUiPrivileges();

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderToolsPage">
      <KibanaPageTemplate.Header
        pageTitle={<TechPreviewTitle title={labels.tools.title} />}
        description={
          <FormattedMessage
            id="xpack.onechat.tools.toolsDescription"
            defaultMessage="Tools are modular, reusable Elasticsearch operations. {agentsLink} use them to search, retrieve, and analyze your data. Use our built-in tools for common operations, and create your own for custom use cases. {learnMoreLink}"
            values={{
              agentsLink: (
                <EuiLink href={createOnechatUrl(appPaths.agents.list)}>
                  {i18n.translate('xpack.onechat.tools.agentsLinkText', {
                    defaultMessage: 'Agents',
                  })}
                </EuiLink>
              ),
              learnMoreLink: (
                <EuiLink
                  href={docLinks.tools}
                  target="_blank"
                  aria-label={i18n.translate('xpack.onechat.tools.toolsDocumentationAriaLabel', {
                    defaultMessage: 'Learn more about tools in the documentation',
                  })}
                >
                  {i18n.translate('xpack.onechat.tools.toolsDocumentation', {
                    defaultMessage: 'Learn more',
                  })}
                </EuiLink>
              ),
            }}
          />
        }
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          manageTools && (
            <EuiButton
              key="new-esql-tool-button"
              fill
              iconType="plus"
              onClick={() => createTool(ToolType.esql)}
            >
              <EuiText size="s">{labels.tools.newToolButton}</EuiText>
            </EuiButton>
          ),
          <McpConnectionButton key="mcp-server-connection-button" />,
        ]}
      />
      <KibanaPageTemplate.Section>
        <OnechatToolsTable />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
