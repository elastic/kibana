/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node } from 'unist';
import type { Parent } from 'mdast';

export const customCodeBlockLanguagePlugin = () => {
  const visitor = (node: Node) => {
    if ('children' in node) {
      const nodeAsParent = node as Parent;
      nodeAsParent.children.forEach((child) => {
        visitor(child);
      });
    }

    if (
      node.type === 'code' &&
      (node.lang === 'eql' ||
        node.lang === 'esql' ||
        node.lang === 'kql' ||
        node.lang === 'dsl' ||
        node.lang === 'json')
    ) {
      node.type = 'customCodeBlock';
    }
  };

  return (tree: Node) => {
    visitor(tree);
  };
};
