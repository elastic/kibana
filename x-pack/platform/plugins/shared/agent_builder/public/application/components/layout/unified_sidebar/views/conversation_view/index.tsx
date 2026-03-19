/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { EuiHorizontalRule, EuiFlexItem, useEuiTheme, EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { appPaths } from '../../../../../utils/app_paths';
import { getAgentIdFromPath, getConversationIdFromPath } from '../../../../../route_config';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { useValidateAgentId } from '../../../../../hooks/agents/use_validate_agent_id';
import { useAgentBuilderAgents } from '../../../../../hooks/agents/use_agents';
import { useLastAgentId } from '../../../../../hooks/use_last_agent_id';

import { ConversationFooter, FOOTER_HEIGHT } from './conversation_footer';
import { ConversationList } from './conversation_list';
import { SidebarLink } from './sidebar_link';

const customizeLabel = i18n.translate('xpack.agentBuilder.sidebar.conversation.customize', {
  defaultMessage: 'Customize',
});

const containerStyles = css`
  position: relative;
  height: 100%;
  width: 100%;
`;

export const ConversationSidebarView: React.FC = () => {
  const { pathname } = useLocation();
  const agentId = getAgentIdFromPath(pathname) ?? agentBuilderDefaultAgentId;
  const conversationId = getConversationIdFromPath(pathname);
  const { euiTheme } = useEuiTheme();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const validateAgentId = useValidateAgentId();
  const { isFetched: isAgentsFetched } = useAgentBuilderAgents();
  const lastAgentId = useLastAgentId();

  // TODO: add header height
  const scrollableStyles = css`
    position: absolute;
    top: ${200}px;
    bottom: ${FOOTER_HEIGHT}px;
    padding: ${euiTheme.size.base};
    left: 0;
    right: 0;
    overflow-y: auto;
  `;

  useEffect(() => {
    // Once agents have loaded, redirect to the last valid agent if the current agent ID
    // is not recognised — but only when there is no conversation ID in the URL (new
    // conversation route). Existing conversations for a deleted agent are intentionally
    // shown read-only with the input disabled.

    // We also check that lastAgentId itself is valid before redirecting: if local storage
    // holds a stale/invalid ID too, navigating to it would trigger this effect again and
    // cause an infinite redirect loop.
    if (
      isAgentsFetched &&
      !conversationId &&
      !validateAgentId(agentId) &&
      validateAgentId(lastAgentId)
    ) {
      navigateToAgentBuilderUrl(appPaths.agent.root({ agentId: lastAgentId }));
    }
  }, [
    isAgentsFetched,
    conversationId,
    agentId,
    lastAgentId,
    validateAgentId,
    navigateToAgentBuilderUrl,
  ]);

  const CustomizeLink = () => (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <SidebarLink
          label={customizeLabel}
          href={appPaths.agent.instructions({ agentId })}
          onClick={(e) => {
            e.preventDefault();
            navigateToAgentBuilderUrl(appPaths.agent.instructions({ agentId }));
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <div css={containerStyles}>
      <CustomizeLink />
      {/* Scrollable conversation list */}
      {/* <div css={scrollableStyles}>
        <ConversationList agentId={agentId} currentConversationId={conversationId} />
      </div> */}

      <ConversationFooter />
    </div>
  );
};
