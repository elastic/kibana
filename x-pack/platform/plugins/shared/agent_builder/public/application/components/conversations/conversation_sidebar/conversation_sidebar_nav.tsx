/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiListGroup, EuiListGroupItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';

export const ConversationSidebarNav: React.FC<{}> = () => {
  const { createAgentBuilderUrl } = useNavigation();
  const agentsHref = createAgentBuilderUrl(appPaths.agents.list);
  const toolsHref = createAgentBuilderUrl(appPaths.tools.list);
  const { euiTheme } = useEuiTheme();
  const containerStyles = css`
    border-top: 1px solid ${euiTheme.border.color};
    padding: ${euiTheme.size.m} ${euiTheme.size.base};
  `;

  return (
    <EuiListGroup css={containerStyles} gutterSize="none">
      <EuiListGroupItem
        color="text"
        size="s"
        href={agentsHref}
        iconType="spaces"
        label={
          <FormattedMessage
            id="xpack.agentBuilder.conversationSidebar.navigation.agents"
            defaultMessage="Agents"
          />
        }
      />
      <EuiListGroupItem
        color="text"
        size="s"
        href={toolsHref}
        iconType="wrench"
        label={
          <FormattedMessage
            id="xpack.agentBuilder.conversationSidebar.navigation.tools"
            defaultMessage="Tools"
          />
        }
      />
    </EuiListGroup>
  );
};
