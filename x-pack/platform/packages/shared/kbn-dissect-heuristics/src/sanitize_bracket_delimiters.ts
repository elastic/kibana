/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DelimiterNode } from './types';

/**
 * Sanitize delimiter literals by removing bracket characters that participate in
 * mismatched or unmatched pairs when scanning left-to-right.
 *
 * A character is considered unstable if:
 * - It is a closing bracket whose expected opener is not at the top of the stack
 * - It is an opening bracket left unmatched at the end of the scan
 * - An unexpected closer causes both the closer and the top opener to be marked
 *
 * All occurrences of unstable bracket characters are removed from delimiter literals.
 * Delimiters whose literals become empty after sanitization are dropped entirely.
 */
export function sanitizeBracketDelimiters(tree: DelimiterNode[]): DelimiterNode[] {
  if (!tree.length) return tree;

  const bracketOpeners = new Set(['(', '[', '{']);
  const bracketClosers: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const openerStack: string[] = [];
  const crossMismatchChars = new Set<string>();

  for (const node of tree) {
    for (const ch of node.literal) {
      if (bracketOpeners.has(ch)) {
        openerStack.push(ch);
      } else if (bracketClosers[ch]) {
        const expected = bracketClosers[ch];
        const top = openerStack[openerStack.length - 1];
        if (!top || top !== expected) {
          crossMismatchChars.add(ch);
          if (top && top !== expected) {
            crossMismatchChars.add(top);
            openerStack.pop();
          }
        } else {
          openerStack.pop();
        }
      }
    }
  }

  // Any unmatched openers remaining are unstable
  for (const remaining of openerStack) crossMismatchChars.add(remaining);

  if (!crossMismatchChars.size) return tree;

  const sanitized: DelimiterNode[] = [];
  for (const node of tree) {
    const newLiteral = [...node.literal]
      .filter((c) => !('()[]{}'.includes(c) && crossMismatchChars.has(c)))
      .join('');
    if (newLiteral.length === 0) continue;
    sanitized.push({ ...node, literal: newLiteral });
  }
  return sanitized;
}
