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
  type VisualizationElementAttributes,
  type TabularDataResult,
} from '@kbn/onechat-common/tools/tool_result';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import classNames from 'classnames';
import { EuiCode, EuiText, useEuiTheme } from '@elastic/eui';

import type { OnechatStartDependencies } from '../../../../types';
import { VisualizeESQL } from '../../tools/esql/visualize_esql';

type MutableNode = Node & {
  value?: string;
  toolResultId?: string;
  chartType?: string;
};

export const visualizationTagParser = () => {
  const extractAttribute = (value: string, attr: string) => {
    const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
    return value.match(regex)?.[1];
  };

  const getVisualizationAttributes = (value: string) => ({
    toolResultId: extractAttribute(value, visualizationElement.attributes.toolResultId),
    chartType: extractAttribute(value, visualizationElement.attributes.chartType),
  });

  const assignVisualizationAttributes = (
    node: MutableNode,
    attributes: ReturnType<typeof getVisualizationAttributes>
  ) => {
    node.type = visualizationElement.tagName;
    node.toolResultId = attributes.toolResultId;
    node.chartType = attributes.chartType;
    delete node.value;
  };

  const visualizationTagRegex = new RegExp(`<${visualizationElement.tagName}\\b[^>]*\\/?>`, 'gi');

  const createVisualizationNode = (
    attributes: ReturnType<typeof getVisualizationAttributes>,
    position: MutableNode['position']
  ): MutableNode => ({
    type: visualizationElement.tagName,
    toolResultId: attributes.toolResultId,
    chartType: attributes.chartType,
    position,
  });

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
      if (!trimmedValue.toLowerCase().startsWith(`<${visualizationElement.tagName}`)) {
        continue; // terminate iteration if not starting with visualization tag
      }

      const matches = Array.from(trimmedValue.matchAll(visualizationTagRegex));
      if (matches.length === 0) {
        continue; // terminate iteration if no matches found
      }

      const visualizationAttributes = matches.map((match) => getVisualizationAttributes(match[0]));
      const leftoverContent = trimmedValue.replace(visualizationTagRegex, '').trim();

      assignVisualizationAttributes(child, visualizationAttributes[0]);

      if (visualizationAttributes.length === 1 || leftoverContent.length > 0) {
        continue;
      }

      const additionalNodes = visualizationAttributes
        .slice(1)
        .map((attributes) => createVisualizationNode(attributes, child.position));

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

    const toolResult = steps
      .filter((s) => s.type === 'tool_call')
      .flatMap((s) => (s.type === 'tool_call' && s.results) || [])
      .find((r) => r.type === 'tabular_data' && r.tool_result_id === toolResultId) as
      | TabularDataResult
      | undefined;

    const ToolResultAttribute = (
      <EuiCode>
        {visualizationElement.attributes.toolResultId}={toolResultId}
      </EuiCode>
    );

    if (!toolResult) {
      return <EuiText>Unable to find visualization for {ToolResultAttribute}.</EuiText>;
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
