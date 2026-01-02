/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Parent } from 'mdast';
import type { Node } from 'unist';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

export type MutableNode = Node & {
  value?: string;
  toolResultId?: string;
  chartType?: string;
};

export const createTagParser = <T extends Record<string, string | undefined>>(config: {
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

export const findToolResult = <T>(
  steps: ConversationRoundStep[],
  toolResultId: string,
  resultType: ToolResultType
): T | undefined => {
  return steps
    .filter((s) => s.type === 'tool_call')
    .flatMap((s) => (s.type === 'tool_call' && s.results) || [])
    .find((r) => r.type === resultType && r.tool_result_id === toolResultId) as T | undefined;
};
