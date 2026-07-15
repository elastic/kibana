/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentType } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
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
    <EuiPanel hasBorder paddingSize="none" css={styles.panel}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="productAgent" size="m" css={styles.assistanceText} aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem css={styles.content}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="s" textAlign="left" css={styles.assistanceText}>
                <strong>
                  {i18n.translate('xpack.agentBuilderDashboards.emptyScreen.createWithChatTitle', {
                    defaultMessage: 'Create with Chat',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    color="text"
                    minWidth={false}
                    contentProps={{ css: styles.promptButtonContent }}
                    css={styles.promptButton}
                    onClick={() => openDashboardChat(openChat, metricsPrompt)}
                    data-test-subj="dashboardCreateWithChatMetricsPrompt"
                  >
                    {metricsPrompt}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    color="text"
                    minWidth={false}
                    contentProps={{ css: styles.promptButtonContent }}
                    css={styles.promptButton}
                    onClick={() => openDashboardChat(openChat, logsPrompt)}
                    data-test-subj="dashboardCreateWithChatLogsPrompt"
                  >
                    {logsPrompt}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
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

const styles = {
  panel: ({ euiTheme }: UseEuiTheme) =>
    css({
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderStrongAssistance}`,
      padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
      textAlign: 'left',
      width: '100%',
    }),
  assistanceText: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textAssistance,
    }),
  promptButton: css({
    borderRadius: '12px',
  }),
  promptButtonContent: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingInline: euiTheme.size.xxs,
    }),
  content: css({
    minWidth: 0,
  }),
};
