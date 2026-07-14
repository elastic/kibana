/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentType } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { openDashboardChat } from './open_dashboard_chat';

const metricsPrompt = i18n.translate(
  'xpack.agentBuilderDashboards.emptyScreen.metricsPromptButtonLabel',
  {
    defaultMessage: 'Create a dashboard for my metrics',
  }
);

const logsPrompt = i18n.translate(
  'xpack.agentBuilderDashboards.emptyScreen.logsPromptButtonLabel',
  {
    defaultMessage: 'Build a dashboard to monitor my logs',
  }
);

export interface DashboardEmptyScreenChatProps {
  openChat: AgentBuilderPluginStart['openChat'];
}

export const DashboardEmptyScreenChat = ({ openChat }: DashboardEmptyScreenChatProps) => {
  return (
    <EuiPanel hasBorder paddingSize="s">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.agentBuilderDashboards.emptyScreen.createWithAgentTitle', {
                defaultMessage: 'Create with AI Agent',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="hollow"
                onClick={() => openDashboardChat(openChat, metricsPrompt)}
                onClickAriaLabel={metricsPrompt}
                data-test-subj="dashboardCreateWithChatMetricsPrompt"
              >
                {metricsPrompt}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="hollow"
                onClick={() => openDashboardChat(openChat, logsPrompt)}
                onClickAriaLabel={logsPrompt}
                data-test-subj="dashboardCreateWithChatLogsPrompt"
              >
                {logsPrompt}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const createDashboardEmptyScreenChat = (
  props: DashboardEmptyScreenChatProps
): ComponentType => {
  return function DashboardEmptyScreenChatExtension() {
    return <DashboardEmptyScreenChat {...props} />;
  };
};
