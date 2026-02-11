/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Parent } from 'mdast';
import type { Node } from 'unist';

type CodeNode = Node & {
  lang?: string;
};

export const esqlLanguagePlugin = () => {
  const visitor = (node: Node, parent?: Parent) => {
    if ('children' in node) {
      const nodeAsParent = node as Parent;
      nodeAsParent.children.forEach((child) => {
        visitor(child, nodeAsParent);
      });
    }

    if (node.type === 'code' && (node as CodeNode).lang === 'esql') {
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
