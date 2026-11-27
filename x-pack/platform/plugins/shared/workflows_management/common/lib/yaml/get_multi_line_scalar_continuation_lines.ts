/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document, LineCounter } from 'yaml';
import { visit } from 'yaml';

/**
 * The 1-based numbers of the lines that continue a multi-line scalar (quoted, plain or block).
 * Their text is content, never `key: value`, so line-based heuristics such as
 * `correctYamlSyntax` must leave them alone.
 */
export const getMultiLineScalarContinuationLines = (
  doc: Document,
  lineCounter: LineCounter
): Set<number> => {
  const lines = new Set<number>();
  visit(doc, {
    Scalar: (_key, node) => {
      if (!node.range) return;
      const [start, valueEnd] = node.range;
      const firstLine = lineCounter.linePos(start).line;
      // `valueEnd` can sit right after the final newline of a block scalar, on the next line.
      const lastLine = lineCounter.linePos(Math.max(start, valueEnd - 1)).line;
      for (let line = firstLine + 1; line <= lastLine; line += 1) lines.add(line);
    },
  });
  return lines;
};
