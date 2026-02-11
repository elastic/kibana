/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import React from 'react';
import {
  EuiCode,
  EuiText,
  useEuiTheme,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { type DashboardResult, ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  dashboardElement,
  type DashboardElementAttributes,
} from '@kbn/agent-builder-common/tools/custom_rendering';

import { createTagParser, findToolResult } from './utils';

export const dashboardTagParser = createTagParser({
  tagName: dashboardElement.tagName,
  getAttributes: (value, extractAttr) => ({
    toolResultId: extractAttr(value, dashboardElement.attributes.toolResultId),
  }),
  assignAttributes: (node, attributes) => {
    node.type = dashboardElement.tagName;
    node.toolResultId = attributes.toolResultId;
    delete node.value;
  },
  createNode: (attributes, position) => ({
    type: dashboardElement.tagName,
    toolResultId: attributes.toolResultId,
    position,
  }),
});

const DashboardCard: React.FC<{
  title: string;
  url?: string;
}> = ({ title, url }) => {
  const { euiTheme } = useEuiTheme();

  const iconContainerStyles = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.xxl};
    height: ${euiTheme.size.xxl};
    border-radius: ${euiTheme.border.radius.medium};
    background-color: ${euiTheme.colors.primary};
  `;

  const panelStyles = css`
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.primary};
  `;

  const cardContent = (
    <EuiPanel hasShadow={false} paddingSize="m" color="primary" className={panelStyles}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <div className={iconContainerStyles}>
            <EuiIcon type="dashboardApp" size="l" color="ghost" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="default">
            <strong>{title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            Dashboard (Temporary)
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  if (url) {
    return (
      <EuiLink external={false} href={url} target="_blank">
        {cardContent}
      </EuiLink>
    );
  }

  return cardContent;
};

export function createDashboardRenderer({
  stepsFromCurrentRound,
  stepsFromPrevRounds,
}: {
  stepsFromCurrentRound: ConversationRoundStep[];
  stepsFromPrevRounds: ConversationRoundStep[];
}) {
  return (props: DashboardElementAttributes) => {
    const { toolResultId } = props;

    if (!toolResultId) {
      return <EuiText>Dashboard missing {dashboardElement.attributes.toolResultId}.</EuiText>;
    }

    const steps = [...stepsFromPrevRounds, ...stepsFromCurrentRound];
    const toolResult = findToolResult<DashboardResult>(
      steps,
      toolResultId,
      ToolResultType.dashboard
    );

    if (!toolResult) {
      const ToolResultAttribute = (
        <EuiCode>
          {dashboardElement.attributes.toolResultId}={toolResultId}
        </EuiCode>
      );
      return <EuiText>Unable to find dashboard for {ToolResultAttribute}.</EuiText>;
    }

    const { title, content } = toolResult.data;
    const dashboardUrl = content?.url as string | undefined;

    return (
      <>
        <DashboardCard title={title || 'Dashboard'} url={dashboardUrl} />
        <EuiSpacer size="m" />
      </>
    );
  };
}
