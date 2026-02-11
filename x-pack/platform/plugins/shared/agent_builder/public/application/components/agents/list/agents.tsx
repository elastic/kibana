/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiButton, EuiButtonEmpty, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { AgentsList } from './agents_list';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { DeleteAgentProvider } from '../../../context/delete_agent_context';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';

const manageToolsLabel = i18n.translate('xpack.agentBuilder.agents.manageToolsLabel', {
  defaultMessage: 'Manage tools',
});

export const AgentBuilderAgents = () => {
  const { euiTheme } = useEuiTheme();
  const { manageAgents } = useUiPrivileges();
  const { docLinksService } = useAgentBuilderServices();
  const headerStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border-style: none;
  `;
  const { createAgentBuilderUrl } = useNavigation();
  const headerButtons = [
    manageAgents && (
      <EuiButton
        iconType="plus"
        color="primary"
        fill
        iconSide="left"
        href={createAgentBuilderUrl(appPaths.agents.new)}
        data-test-subj="agentBuilderNewAgentButton"
      >
        {i18n.translate('xpack.agentBuilder.agents.newAgentButton', {
          defaultMessage: 'New agent',
        })}
      </EuiButton>
    ),
    <EuiButtonEmpty aria-label={manageToolsLabel} href={createAgentBuilderUrl(appPaths.tools.list)}>
      <EuiText size="s">{manageToolsLabel}</EuiText>
    </EuiButtonEmpty>,
  ];
  return (
    <DeleteAgentProvider>
      <KibanaPageTemplate
        mainProps={{
          'aria-label': i18n.translate('xpack.agentBuilder.agents.mainAriaLabel', {
            defaultMessage: 'Agent Builder agents list',
          }),
        }}
      >
        <KibanaPageTemplate.Header
          css={headerStyles}
          pageTitle={i18n.translate('xpack.agentBuilder.agents.title', {
            defaultMessage: 'Agents',
          })}
          pageTitleProps={{ 'data-test-subj': 'agentBuilderAgentsListPageTitle' }}
          description={
            <FormattedMessage
              id="xpack.agentBuilder.agents.description"
              defaultMessage="Define agents with custom instructions and assign them tools to answer questions about your data and take actions on your behalf. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    href={docLinksService.agentBuilderAgents}
                    target="_blank"
                    aria-label={i18n.translate(
                      'xpack.agentBuilder.agents.agentsDocumentationAriaLabel',
                      {
                        defaultMessage: 'Learn more about agents in the documentation',
                      }
                    )}
                  >
                    {i18n.translate('xpack.agentBuilder.agents.agentsDocumentation', {
                      defaultMessage: 'Learn more',
                    })}
                  </EuiLink>
                ),
              }}
            />
          }
          rightSideItems={headerButtons}
        />
        <KibanaPageTemplate.Section data-test-subj="agentBuilderAgentsListContent">
          <AgentsList />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </DeleteAgentProvider>
  );
};
