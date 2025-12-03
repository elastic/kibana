/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Code, InlineCode, Parent, Text } from 'mdast';
import type { Node } from 'unist';
import { css } from '@emotion/css';
import React from 'react';
import {
  visualizationElement,
  dashboardElement,
  type VisualizationElementAttributes,
  type DashboardElementAttributes,
  type TabularDataResult,
  type VisualizationResult,
  type DashboardResult,
  ToolResultType,
} from '@kbn/onechat-common/tools/tool_result';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import classNames from 'classnames';
import {
  EuiCode,
  EuiText,
  useEuiTheme,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';

import type { OnechatStartDependencies } from '../../../../../types';
import { VisualizeESQL } from '../../../tools/esql/visualize_esql';
import { VisualizeLens } from '../../../tools/esql/visualize_lens';

type MutableNode = Node & {
  value?: string;
  toolResultId?: string;
  chartType?: string;
};

const createTagParser = <T extends Record<string, string | undefined>>(config: {
  tagName: string;
  getAttributes: (
    value: string,
    extractAttr: (value: string, attr: string) => string | undefined
  ) => T;
  assignAttributes: (node: MutableNode, attributes: T) => void;
  createNode: (attributes: T, position: MutableNode['position']) => MutableNode;
}) => {
  return () => {
    const extractAttribute = (value: string, attr: string) => {
      const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
      return value.match(regex)?.[1];
    };

    const tagRegex = new RegExp(`<${config.tagName}\\b[^>]*\\/?>`, 'gi');

    const visitParent = (parent: Parent) => {
      for (let index = 0; index < parent.children.length; index++) {
        const child = parent.children[index] as MutableNode;

        if ('children' in child) {
          visitParent(child as Parent);
        }

        if (child.type !== 'html') {
          continue; // terminate iteration if not html node
        }

        const rawValue = child.value;
        if (!rawValue) {
          continue; // terminate iteration if no value attribute
        }

        const trimmedValue = rawValue.trim();
        if (!trimmedValue.toLowerCase().startsWith(`<${config.tagName}`)) {
          continue; // terminate iteration if not starting with tag
        }

        const matches = Array.from(trimmedValue.matchAll(tagRegex));
        if (matches.length === 0) {
          continue; // terminate iteration if no matches found
        }

        const parsedAttributes = matches.map((match) =>
          config.getAttributes(match[0], extractAttribute)
        );
        const leftoverContent = trimmedValue.replace(tagRegex, '').trim();

        config.assignAttributes(child, parsedAttributes[0]);

        if (parsedAttributes.length === 1 || leftoverContent.length > 0) {
          continue;
        }

        const additionalNodes = parsedAttributes
          .slice(1)
          .map((attributes) => config.createNode(attributes, child.position));

        const siblings = parent.children as Node[];
        siblings.splice(index + 1, 0, ...additionalNodes);
        index += additionalNodes.length;
        continue;
      }
    };

    return (tree: Node) => {
      if ('children' in tree) {
        visitParent(tree as Parent);
      }
    };
  };
};

const findToolResult = <T,>(
  steps: ConversationRoundStep[],
  toolResultId: string,
  resultType: ToolResultType
): T | undefined => {
  return steps
    .filter((s) => s.type === 'tool_call')
    .flatMap((s) => (s.type === 'tool_call' && s.results) || [])
    .find((r) => r.type === resultType && r.tool_result_id === toolResultId) as T | undefined;
};

export const visualizationTagParser = createTagParser({
  tagName: visualizationElement.tagName,
  getAttributes: (value, extractAttr) => ({
    toolResultId: extractAttr(value, visualizationElement.attributes.toolResultId),
    chartType: extractAttr(value, visualizationElement.attributes.chartType),
  }),
  assignAttributes: (node, attributes) => {
    node.type = visualizationElement.tagName;
    node.toolResultId = attributes.toolResultId;
    node.chartType = attributes.chartType;
    delete node.value;
  },
  createNode: (attributes, position) => ({
    type: visualizationElement.tagName,
    toolResultId: attributes.toolResultId,
    chartType: attributes.chartType,
    position,
  }),
});

export function createVisualizationRenderer({
  startDependencies,
  stepsFromCurrentRound,
  stepsFromPrevRounds,
}: {
  startDependencies: OnechatStartDependencies;
  stepsFromCurrentRound: ConversationRoundStep[];
  stepsFromPrevRounds: ConversationRoundStep[];
}) {
  return (props: VisualizationElementAttributes) => {
    const { toolResultId, chartType } = props;

    if (!toolResultId) {
      return (
        <EuiText>Visualization missing {visualizationElement.attributes.toolResultId}.</EuiText>
      );
    }

    const steps = [...stepsFromPrevRounds, ...stepsFromCurrentRound];

    const ToolResultAttribute = (
      <EuiCode>
        {visualizationElement.attributes.toolResultId}={toolResultId}
      </EuiCode>
    );

    // First, look for tabular data results (from execute_esql)
    let toolResult: TabularDataResult | VisualizationResult | undefined =
      findToolResult<TabularDataResult>(steps, toolResultId, ToolResultType.tabularData);

    // If not found, look for visualization results (from create_visualization)
    if (!toolResult) {
      toolResult = findToolResult<VisualizationResult>(
        steps,
        toolResultId,
        ToolResultType.visualization
      );
    }

    if (!toolResult) {
      return <EuiText>Unable to find visualization for {ToolResultAttribute}.</EuiText>;
    }

    // Handle visualization result (pre-built Lens config)
    if (toolResult.type === 'visualization') {
      const { visualization } = toolResult.data;
      return (
        <VisualizeLens
          lensConfig={visualization}
          dataViews={startDependencies.dataViews}
          lens={startDependencies.lens}
          uiActions={startDependencies.uiActions}
        />
      );
    }

    const { columns, query } = toolResult.data;

    if (!query) {
      return <EuiText>Unable to find esql query for {ToolResultAttribute}.</EuiText>;
    }

    return (
      <VisualizeESQL
        lens={startDependencies.lens}
        dataViews={startDependencies.dataViews}
        uiActions={startDependencies.uiActions}
        esqlQuery={query}
        esqlColumns={columns}
        preferredChartType={chartType}
      />
    );
  };
}

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

    return <DashboardCard title={title || 'Dashboard'} url={dashboardUrl} />;
  };
}

const CURSOR = ` ᠎  `;
export const loadingCursorPlugin = () => {
  const visitor = (node: Node, parent?: Parent) => {
    if ('children' in node) {
      const nodeAsParent = node as Parent;
      nodeAsParent.children.forEach((child) => {
        visitor(child, nodeAsParent);
      });
    }

    if (node.type !== 'text' && node.type !== 'inlineCode' && node.type !== 'code') {
      return;
    }

    const textNode = node as Text | InlineCode | Code;

    const indexOfCursor = textNode.value.indexOf(CURSOR);
    if (indexOfCursor === -1) {
      return;
    }

    textNode.value = textNode.value.replace(CURSOR, '');

    const indexOfNode = parent!.children.indexOf(textNode);

    parent!.children.splice(indexOfNode + 1, 0, {
      type: 'cursor' as Text['type'],
      value: CURSOR,
    });
  };

  return (tree: Node) => {
    visitor(tree);
  };
};

export const Cursor = () => {
  const { euiTheme } = useEuiTheme();

  const cursorCss = css`
    @keyframes blink {
      0% {
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }

    animation: blink 1s infinite;
    width: 10px;
    height: 16px;
    display: inline-block;
    vertical-align: middle;
    background: ${euiTheme.colors.backgroundLightText};
  `;

  return <span key="cursor" className={classNames(cursorCss, 'cursor')} />;
};

export const esqlLanguagePlugin = () => {
  const visitor = (node: Node, parent?: Parent) => {
    if ('children' in node) {
      const nodeAsParent = node as Parent;
      nodeAsParent.children.forEach((child) => {
        visitor(child, nodeAsParent);
      });
    }

    if (node.type === 'code' && node.lang === 'esql') {
      node.type = 'esql';
    } else if (node.type === 'code') {
      // switch to type that allows us to control rendering
      node.type = 'codeBlock';
    }
  };

  return (tree: Node) => {
    visitor(tree);
  };
};
