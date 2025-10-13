/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Parent, Node } from 'unist';
import type { CustomElementConfig, MarkdownParser } from './types';

type MutableNode = Node & {
  value?: string;
  [key: string]: any;
};

/**
 * Creates a markdown parser plugin for a custom element
 * @param config - Element configuration with tag name and attributes
 * @returns Unified markdown parser plugin
 */
export const createElementParser = (config: CustomElementConfig): MarkdownParser => {
  const { tagName, attributes } = config;

  const extractAttribute = (value: string, attr: string) => {
    const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
    return value.match(regex)?.[1];
  };

  const getElementAttributes = (value: string): Record<string, string | undefined> => {
    const result: Record<string, string | undefined> = {};
    for (const [key, attrName] of Object.entries(attributes)) {
      result[key] = extractAttribute(value, attrName);
    }
    return result;
  };

  const assignElementAttributes = (
    node: MutableNode,
    extractedAttributes: Record<string, string | undefined>
  ) => {
    node.type = tagName;
    Object.assign(node, extractedAttributes);
    delete node.value;
  };

  const elementTagRegex = new RegExp(`<${tagName}\\b[^>]*\\/?>`, 'gi');

  const createElementNode = (
    extractedAttributes: Record<string, string | undefined>,
    position: MutableNode['position']
  ): MutableNode => ({
    type: tagName,
    ...extractedAttributes,
    position,
  });

  const visitParent = (parent: Parent) => {
    for (let index = 0; index < parent.children.length; index++) {
      const child = parent.children[index] as MutableNode;

      if ('children' in child) {
        visitParent(child as Parent);
      }

      if (child.type !== 'html') {
        continue;
      }

      const rawValue = child.value;
      if (!rawValue) {
        continue;
      }

      const trimmedValue = rawValue.trim();
      if (!trimmedValue.toLowerCase().startsWith(`<${tagName}`)) {
        continue;
      }

      const matches = Array.from(trimmedValue.matchAll(elementTagRegex));
      if (matches.length === 0) {
        continue;
      }

      const elementAttributes = matches.map((match) => getElementAttributes(match[0]));
      const leftoverContent = trimmedValue.replace(elementTagRegex, '').trim();

      assignElementAttributes(child, elementAttributes[0]);

      if (elementAttributes.length === 1 || leftoverContent.length > 0) {
        continue;
      }

      const additionalNodes = elementAttributes
        .slice(1)
        .map((attrs) => createElementNode(attrs, child.position));

      const siblings = parent.children as Node[];
      siblings.splice(index + 1, 0, ...additionalNodes);
      index += additionalNodes.length;
    }
  };

  return (tree: Node) => {
    if ('children' in tree) {
      visitParent(tree as Parent);
    }
  };
};

