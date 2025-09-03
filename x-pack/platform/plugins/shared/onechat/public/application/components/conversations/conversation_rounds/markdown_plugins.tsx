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
import { ChartType } from '@kbn/visualization-utils';
import {
  visualizationElement,
  type TabularDataResult,
} from '@kbn/onechat-common/tools/tool_result';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import classNames from 'classnames';
import { useEuiTheme } from '@elastic/eui';
import type { OnechatStartDependencies } from '../../../../types';
import { VisualizeESQL } from '../../tools/esql/visualize_esql';

export const visualizationPlugin = () => {
  const visitor = (node: Node) => {
    if ('children' in node) {
      const parent = node as Parent;
      parent.children.forEach((child) => visitor(child));
    }

    if ((node as any).type !== 'html') {
      return;
    }

    // find <visualization> nodes
    const value = (node as any).value as string | undefined;
    if (!value || !value.trim().toLowerCase().startsWith(`<${visualizationElement.tagName}`)) {
      return;
    }

    // extract attributes
    const toolResultRegex = new RegExp(
      `${visualizationElement.attributes.toolResultId}="([^"]*)"`,
      'i'
    );
    const toolResultId = value.match(toolResultRegex)?.[1];

    // transform the node from type `html` to (custom) type `visualization`
    (node as any).type = visualizationElement.tagName;
    (node as any).toolResultId = toolResultId;
    delete (node as any).value; // remove the raw HTML value
  };

  return (tree: Node) => {
    visitor(tree);
  };
};

export function getVisualizationHandler({
  startDependencies,
  stepsFromCurrentRound,
  stepsFromPrevRounds,
}: {
  startDependencies: OnechatStartDependencies;
  stepsFromCurrentRound: ConversationRoundStep[];
  stepsFromPrevRounds: ConversationRoundStep[];
}) {
  return (props: any) => {
    const { toolResultId, chartType } = props;

    if (!toolResultId) {
      return <p>Visualization requires a tool result ID.</p>;
    }

    const steps = [...stepsFromPrevRounds, ...stepsFromCurrentRound];

    const toolResult = steps
      .filter((s) => s.type === 'tool_call')
      .flatMap((s) => (s.type === 'tool_call' && s.results) || [])
      .find((r) => r.type === 'tabular_data' && r.tool_result_id === toolResultId) as
      | TabularDataResult
      | undefined;

    if (!toolResult) {
      return <p>Unable to find visualization for tool result ID: {toolResultId}</p>;
    }

    const { columns, query } = toolResult.data;

    if (!query) {
      return <p>Unable to find query for tool result ID: {toolResultId}</p>;
    }

    return (
      <VisualizeESQL
        lens={startDependencies.lens}
        dataViews={startDependencies.dataViews}
        esqlQuery={query}
        esqlColumns={columns}
        preferredChartType={(chartType as ChartType | undefined) || ChartType.Line}
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
