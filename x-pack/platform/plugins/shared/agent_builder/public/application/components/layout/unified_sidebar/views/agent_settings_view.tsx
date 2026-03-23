/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { EuiFlexGroup, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { css } from '@emotion/react';
import { getAgentIdFromPath, getAgentSettingsNavItems } from '../../../../route_config';
import { useKibana } from '../../../../hooks/use_kibana';
import { useAgentBuilderAgentById } from '../../../../hooks/agents/use_agent_by_id';
import { SidebarNavList } from '../shared/sidebar_nav_list';

interface AgentSettingsSidebarViewProps {
  pathname: string;
}

export const AgentSettingsSidebarView: React.FC<AgentSettingsSidebarViewProps> = ({ pathname }) => {
  const agentId = getAgentIdFromPath(pathname) ?? agentBuilderDefaultAgentId;
  const { euiTheme } = useEuiTheme();
  const {
    services: { uiSettings },
  } = useKibana();
  const isConnectorsEnabled = uiSettings.get<boolean>(
    AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID,
    false
  );
  const { agent } = useAgentBuilderAgentById(agentId);

  const navItems = useMemo(() => {
    return getAgentSettingsNavItems(agentId)
      .filter((item) => {
        if (item.isConnectors && !isConnectorsEnabled) {
          return false;
        }
        return true;
      })
      .map((item) => {
        if (item.isAgentDisplayName) {
          return { ...item, label: agent?.name ?? '' };
        }
        return item;
      });
  }, [agentId, isConnectorsEnabled, agent]);

  const isActive = (path: string) => pathname === path;

  return (
    <EuiFlexGroup direction="column" gutterSize="none" data-test-subj="agentBuilderSidebar-agent">
      <EuiHorizontalRule margin="none" />
      <EuiFlexGroup
        direction="column"
        css={css`
          padding: ${euiTheme.size.base};
        `}
      >
        <SidebarNavList items={navItems} isActive={isActive} />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
