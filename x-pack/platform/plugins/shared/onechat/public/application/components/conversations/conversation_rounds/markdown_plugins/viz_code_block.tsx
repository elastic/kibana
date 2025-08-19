/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, Parent } from 'unist';
import type { Paragraph, Text } from 'mdast';

export const vizLanguagePlugin = () => {
  const transform = (node: Node, parent?: Parent) => {
    // Recurse depth-first
    if ('children' in node && Array.isArray((node as any).children)) {
      const p = node as Parent;
      for (const child of p.children) transform(child, p);
    }

    const t = (node as any).type;

    // Support both before/after your esqlLanguagePlugin
    if (t !== 'code' && t !== 'codeBlock') return;

    const lang = (node as any).lang;
    if (lang !== 'toolresult') return;

    // Prefer the block body; fallback to meta if you ever place JSON there
    const raw =
      (typeof (node as any).value === 'string' && (node as any).value.trim()) ||
      (typeof (node as any).meta === 'string' && (node as any).meta.trim()) ||
      '';

    let spec: unknown;
    try {
      spec = JSON.parse(raw);
    } catch (e) {
      if (parent) {
        const i = parent.children.indexOf(node as any);
        const errorPara: Paragraph = {
          type: 'paragraph',
          children: [
            { type: 'text', value: `Invalid toolresult spec: ${(e as Error).message}` } as Text,
          ],
        };
        (parent.children as any[]).splice(i, 1, errorPara);
      }
      return;
    }

    // Replace with a custom node -> will become <toolresult spec={...} />
    (node as any).type = 'toolresult';
    (node as any).data = {
      ...(node as any).data,
      hName: 'toolresult',
      hProperties: { spec },
    };
    delete (node as any).value;
    delete (node as any).lang;
    delete (node as any).meta;
  };

  return (tree: Node) => transform(tree);
};
