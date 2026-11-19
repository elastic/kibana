/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/monaco';

/**
 * Get the indentation level (number of spaces) for a line
 */
export function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

export function getIndentLevelFromLineNumber(
  model: monaco.editor.ITextModel,
  lineNumber: number
): number {
  const line = model.getLineContent(lineNumber);
  return getIndentLevel(line);
}
