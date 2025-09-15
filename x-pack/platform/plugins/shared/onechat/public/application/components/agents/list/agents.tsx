/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiButton, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AgentsList } from './agents_list';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { DeleteAgentProvider } from '../../../context/delete_agent_context';

export const OnechatAgents = () => {
  const { euiTheme } = useEuiTheme();
  const headerStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border: none;
  `;
  const { createOnechatUrl } = useNavigation();
  const headerButtons = [
    <EuiButton
      iconType="plus"
      color="primary"
      fill
      iconSide="left"
      href={createOnechatUrl(appPaths.agents.new)}
    >
      {i18n.translate('xpack.onechat.agents.newAgentButton', {
        defaultMessage: 'New agent',
      })}
    </EuiButton>,
  ];
  return (
    <DeleteAgentProvider>
      <KibanaPageTemplate>
        <KibanaPageTemplate.Header
          css={headerStyles}
          pageTitle={i18n.translate('xpack.onechat.agents.title', {
            defaultMessage: 'Agents',
          })}
          description={i18n.translate('xpack.onechat.agents.description', {
            defaultMessage:
              'Agents are AI assistants that use tools to answer questions, take action, or support workflows.',
          })}
          rightSideItems={headerButtons}
        />
        <KibanaPageTemplate.Section>
          <AgentsList />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </DeleteAgentProvider>
  );
};
