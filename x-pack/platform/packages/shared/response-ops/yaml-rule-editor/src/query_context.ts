/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryContext } from './types';
import { DEFAULT_ESQL_PROPERTY_NAMES } from './types';

/**
 * Create a regex pattern to match any of the ES|QL property names
 */
const createEsqlPropertyPattern = (propertyNames: string[]): RegExp => {
  const escapedNames = propertyNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^(\\s*)(${escapedNames.join('|')}):\\s*(.*)$`);
};

/**
 * Find the ES|QL query context at the cursor position.
 * Handles inline queries, block scalar queries (| or >), and multi-line continuation.
 *
 * @param text - The full YAML text
 * @param cursorOffset - The cursor offset in the text
 * @param esqlPropertyNames - Property names that should be treated as ES|QL queries
 * @returns QueryContext if cursor is within a query, null otherwise
 */
export const findYamlQueryContext = (
  text: string,
  cursorOffset: number,
  esqlPropertyNames: string[] = DEFAULT_ESQL_PROPERTY_NAMES
): QueryContext | null => {
  const lines = text.split('\n');
  const lineStartOffsets: number[] = [];
  let runningOffset = 0;
  let cursorLine = 0;

  for (let i = 0; i < lines.length; i++) {
    lineStartOffsets.push(runningOffset);
    if (cursorOffset >= runningOffset && cursorOffset <= runningOffset + lines[i].length) {
      cursorLine = i;
    }
    runningOffset += lines[i].length + 1;
  }

  const esqlPattern = createEsqlPropertyPattern(esqlPropertyNames);

  for (let queryLineIdx = cursorLine; queryLineIdx >= 0; queryLineIdx--) {
    const line = lines[queryLineIdx];
    const queryMatch = esqlPattern.exec(line);
    if (!queryMatch) continue;

    const baseIndent = queryMatch[1].length;
    const propertyName = queryMatch[2];
    const afterColon = queryMatch[3] ?? '';
    const trimmedAfterColon = afterColon.trim();

    // Case 1: Block scalar (| or >)
    const blockScalarResult = handleBlockScalar(
      lines,
      lineStartOffsets,
      queryLineIdx,
      baseIndent,
      trimmedAfterColon,
      cursorLine,
      cursorOffset,
      propertyName
    );
    if (blockScalarResult !== undefined) {
      return blockScalarResult;
    }

    // Case 2a: Empty value but cursor is on the query line
    if (trimmedAfterColon.length === 0 && cursorLine === queryLineIdx) {
      const colonIdx = line.indexOf(':');
      const valueStartCol = colonIdx + 1;
      const valueStartOffset = lineStartOffsets[queryLineIdx] + valueStartCol;

      if (cursorOffset >= valueStartOffset) {
        return { propertyName, queryText: '', queryOffset: 0 };
      }
      return null;
    }

    // Case 2b: Inline value (possibly with continuation lines)
    if (trimmedAfterColon.length > 0) {
      const inlineResult = handleInlineValue(
        lines,
        lineStartOffsets,
        queryLineIdx,
        line,
        baseIndent,
        afterColon,
        cursorLine,
        cursorOffset,
        propertyName
      );
      if (inlineResult !== undefined) {
        return inlineResult;
      }
    }

    // Case 3: Empty value - check if cursor is on a continuation line
    const emptyValueResult = handleEmptyValue(
      lines,
      lineStartOffsets,
      queryLineIdx,
      baseIndent,
      cursorLine,
      cursorOffset,
      propertyName
    );
    if (emptyValueResult !== undefined) {
      return emptyValueResult;
    }
  }

  return null;
};

/**
 * Handle block scalar (| or >) query values
 */
function handleBlockScalar(
  lines: string[],
  lineStartOffsets: number[],
  queryLineIdx: number,
  baseIndent: number,
  trimmedAfterColon: string,
  cursorLine: number,
  cursorOffset: number,
  propertyName: string
): QueryContext | null | undefined {
  if (!trimmedAfterColon.startsWith('|') && !trimmedAfterColon.startsWith('>')) {
    return undefined; // Not a block scalar, continue to next case
  }

  let blockIndent = 0;
  for (let j = queryLineIdx + 1; j < lines.length; j++) {
    if (lines[j].trim() === '') continue;
    const lineIndent = lines[j].match(/^\s*/)?.[0].length ?? 0;
    if (lineIndent > baseIndent) {
      blockIndent = lineIndent;
    }
    break;
  }

  if (blockIndent === 0) {
    if (cursorLine <= queryLineIdx) return null;
    const cursorIndent = lines[cursorLine].match(/^\s*/)?.[0].length ?? 0;
    blockIndent = Math.max(baseIndent + 2, cursorIndent);
  }

  let endLine = queryLineIdx + 1;
  while (endLine < lines.length) {
    const lineIndent = lines[endLine].match(/^\s*/)?.[0].length ?? 0;
    if (lines[endLine].trim() !== '' && lineIndent < blockIndent) break;
    endLine++;
  }

  if (cursorLine <= queryLineIdx || cursorLine >= endLine) return null;

  const queryLines = lines
    .slice(queryLineIdx + 1, endLine)
    .map((lineText) => (lineText.length >= blockIndent ? lineText.slice(blockIndent) : ''));
  const queryText = queryLines.join('\n');

  const cursorLineInQuery = cursorLine - (queryLineIdx + 1);
  const cursorColInLine = Math.max(0, cursorOffset - lineStartOffsets[cursorLine] - blockIndent);
  const offsetBeforeCursorLine = queryLines
    .slice(0, cursorLineInQuery)
    .reduce((acc, l) => acc + l.length + 1, 0);

  return {
    propertyName,
    queryText,
    queryOffset: Math.max(0, Math.min(queryText.length, offsetBeforeCursorLine + cursorColInLine)),
  };
}

/**
 * Handle inline query values (possibly with continuation lines)
 */
function handleInlineValue(
  lines: string[],
  lineStartOffsets: number[],
  queryLineIdx: number,
  line: string,
  baseIndent: number,
  afterColon: string,
  cursorLine: number,
  cursorOffset: number,
  propertyName: string
): QueryContext | null | undefined {
  const valueStartCol = line.length - afterColon.length;
  const valueStartOffset = lineStartOffsets[queryLineIdx] + valueStartCol;

  const quote = afterColon.startsWith('"') || afterColon.startsWith("'") ? afterColon[0] : null;
  const closingQuoteIdx = quote ? afterColon.lastIndexOf(quote) : -1;
  const queryStartOffset = valueStartOffset + (quote ? 1 : 0);
  const queryEndOffset =
    closingQuoteIdx > 0 ? valueStartOffset + closingQuoteIdx : valueStartOffset + afterColon.length;

  let continuationIndent = 0;
  for (let j = queryLineIdx + 1; j < lines.length; j++) {
    if (lines[j].trim() === '') continue;
    const lineIndent = lines[j].match(/^\s*/)?.[0].length ?? 0;
    if (lineIndent > baseIndent) {
      continuationIndent = lineIndent;
    }
    break;
  }

  if (continuationIndent === 0) {
    if (cursorLine !== queryLineIdx) return null;
    if (cursorOffset < queryStartOffset || cursorOffset > queryEndOffset) return null;

    const queryText = afterColon.slice(
      quote ? 1 : 0,
      closingQuoteIdx > 0 ? closingQuoteIdx : undefined
    );
    return {
      propertyName,
      queryText,
      queryOffset: Math.max(0, Math.min(queryText.length, cursorOffset - queryStartOffset)),
    };
  }

  let endLine = queryLineIdx + 1;
  while (endLine < lines.length) {
    const lineIndent = lines[endLine].match(/^\s*/)?.[0].length ?? 0;
    if (lines[endLine].trim() !== '' && lineIndent <= baseIndent) break;
    endLine++;
  }

  if (cursorLine < queryLineIdx || cursorLine >= endLine) return null;

  const firstLineText = afterColon.slice(
    quote ? 1 : 0,
    closingQuoteIdx > 0 ? closingQuoteIdx : undefined
  );
  const continuationLines = lines.slice(queryLineIdx + 1, endLine).map((lineText) => {
    const lineIndent = lineText.match(/^\s*/)?.[0].length ?? 0;
    return lineIndent >= continuationIndent ? lineText.slice(continuationIndent) : '';
  });
  const queryText = [firstLineText, ...continuationLines].join('\n');

  if (cursorLine === queryLineIdx) {
    if (cursorOffset < queryStartOffset) return null;
    return {
      propertyName,
      queryText,
      queryOffset: Math.max(0, Math.min(firstLineText.length, cursorOffset - queryStartOffset)),
    };
  }

  const cursorLineInQuery = cursorLine - (queryLineIdx + 1);
  const cursorColInLine = Math.max(
    0,
    cursorOffset - lineStartOffsets[cursorLine] - continuationIndent
  );
  const offsetBeforeCursorLine =
    firstLineText.length +
    1 +
    continuationLines.slice(0, cursorLineInQuery).reduce((acc, l) => acc + l.length + 1, 0);

  return {
    propertyName,
    queryText,
    queryOffset: Math.max(0, Math.min(queryText.length, offsetBeforeCursorLine + cursorColInLine)),
  };
}

/**
 * Handle empty value - check if cursor is on a continuation line
 */
function handleEmptyValue(
  lines: string[],
  lineStartOffsets: number[],
  queryLineIdx: number,
  baseIndent: number,
  cursorLine: number,
  cursorOffset: number,
  propertyName: string
): QueryContext | null | undefined {
  if (cursorLine <= queryLineIdx) return null;

  let blockIndent = 0;
  for (let j = queryLineIdx + 1; j < lines.length; j++) {
    if (lines[j].trim() === '') continue;
    const lineIndent = lines[j].match(/^\s*/)?.[0].length ?? 0;
    if (lineIndent > baseIndent) {
      blockIndent = lineIndent;
    }
    break;
  }

  if (blockIndent === 0) {
    const cursorIndent = lines[cursorLine].match(/^\s*/)?.[0].length ?? 0;
    blockIndent = Math.max(baseIndent + 2, cursorIndent);
  }

  let endLine = queryLineIdx + 1;
  while (endLine < lines.length) {
    const lineIndent = lines[endLine].match(/^\s*/)?.[0].length ?? 0;
    if (lines[endLine].trim() !== '' && lineIndent < blockIndent) break;
    endLine++;
  }

  if (cursorLine >= endLine) return null;

  const queryLines = lines
    .slice(queryLineIdx + 1, endLine)
    .map((lineText) => (lineText.length >= blockIndent ? lineText.slice(blockIndent) : ''));
  const queryText = queryLines.join('\n');

  const cursorLineInQuery = cursorLine - (queryLineIdx + 1);
  const cursorColInLine = Math.max(0, cursorOffset - lineStartOffsets[cursorLine] - blockIndent);
  const offsetBeforeCursorLine = queryLines
    .slice(0, cursorLineInQuery)
    .reduce((acc, l) => acc + l.length + 1, 0);

  return {
    propertyName,
    queryText,
    queryOffset: Math.max(0, Math.min(queryText.length, offsetBeforeCursorLine + cursorColInLine)),
  };
}
