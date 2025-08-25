/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Code, InlineCode, Parent, Text } from 'mdast';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';

export const toolResultPlugin = () => {
  return (tree: Node) => {
    visit(tree, 'html', (node: any) => {
      const value = node.value as string;

      if (value?.trim().startsWith('<toolresult')) {
        // match attributes
        const resultIdMatch = value.match(/result-id="([^"]*)"/);
        const chartTypeMatch = value.match(/chart-type="([^"]*)"/);

        const resultId = resultIdMatch ? resultIdMatch[1] : undefined;
        const chartType = chartTypeMatch ? chartTypeMatch[1] : undefined;

        // Transform the node from type `html` to `toolresult`
        node.type = 'toolresult';
        node.resultId = resultId;
        node.chartType = chartType;

        delete node.value; // remove the raw HTML value as it's no longer needed.
      }
    });
  };
};

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
