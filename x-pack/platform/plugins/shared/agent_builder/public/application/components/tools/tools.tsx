/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiText, EuiLink, useEuiTheme, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import { ToolType } from '@kbn/agent-builder-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useToolsActions } from '../../context/tools_provider';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { AgentBuilderToolsTable } from './table/tools_table';
import { McpConnectionButton } from './mcp_server/mcp_connection_button';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';

const manageAgentsLabel = i18n.translate('xpack.agentBuilder.tools.manageAgentsLabel', {
  defaultMessage: 'Manage agents',
});

export const AgentBuilderTools = () => {
  const { euiTheme } = useEuiTheme();
  const { createTool } = useToolsActions();
  const { createAgentBuilderUrl } = useNavigation();
  const { docLinksService } = useAgentBuilderServices();

  const { manageTools } = useUiPrivileges();

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderToolsPage">
      <KibanaPageTemplate.Header
        pageTitle={labels.tools.title}
        description={
          <FormattedMessage
            id="xpack.agentBuilder.tools.toolsDescription"
            defaultMessage="Tools are modular, reusable Elasticsearch operations. Agents use them to search, retrieve, and analyze your data. Use our built-in tools for common operations, and create your own for custom use cases. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink
                  href={docLinksService.tools}
                  target="_blank"
                  aria-label={i18n.translate(
                    'xpack.agentBuilder.tools.toolsDocumentationAriaLabel',
                    {
                      defaultMessage: 'Learn more about tools in the documentation',
                    }
                  )}
                >
                  {i18n.translate('xpack.agentBuilder.tools.toolsDocumentation', {
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
          <EuiButtonEmpty
            key="agents-button"
            href={createAgentBuilderUrl(appPaths.agents.list)}
            aria-label={manageAgentsLabel}
          >
            <EuiText size="s">{manageAgentsLabel}</EuiText>
          </EuiButtonEmpty>,
          <McpConnectionButton key="mcp-server-connection-button" />,
        ]}
      />
      <KibanaPageTemplate.Section>
        <AgentBuilderToolsTable />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
