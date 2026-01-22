/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { CodeEditorField } from '@kbn/code-editor';
import {
  ESQL_AUTOCOMPLETE_TRIGGER_CHARS,
  ESQL_LANG_ID,
  ESQLLang,
  monaco,
  YamlLang,
  YAML_LANG_ID,
} from '@kbn/monaco';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { suggest } from '@kbn/esql-language';
import YAML, { LineCounter } from 'yaml';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createRuleDataSchema } from '../../common/schemas/create_rule_data_schema';

// ============================================================================
// Types
// ============================================================================

interface QueryContext {
  queryText: string;
  queryOffset: number;
}

interface SchemaPropertyInfo {
  key: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'unknown';
  isEnum?: boolean;
  enumValues?: string[];
}

interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  description?: string;
  enum?: Array<string | number | boolean>;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
  definitions?: Record<string, JsonSchema>;
  $defs?: Record<string, JsonSchema>;
  default?: unknown;
}

interface YamlRuleEditorProps {
  value: string;
  onChange: (value: string) => void;
  esqlCallbacks: ESQLCallbacks;
  isReadOnly?: boolean;
  height?: number;
  dataTestSubj?: string;
}

// ============================================================================
// JSON Schema Utilities
// ============================================================================

let cachedJsonSchema: JsonSchema | null = null;
const getJsonSchema = (): JsonSchema => {
  if (!cachedJsonSchema) {
    cachedJsonSchema = zodToJsonSchema(createRuleDataSchema, {
      $refStrategy: 'none',
      errorMessages: true,
    }) as JsonSchema;
  }
  return cachedJsonSchema;
};

const resolveSchema = (schema: JsonSchema): JsonSchema => {
  if (schema.anyOf) {
    const nonNull = schema.anyOf.find(
      (s) => s.type !== 'null' && !(Array.isArray(s.type) && s.type.includes('null'))
    );
    if (nonNull) return resolveSchema(nonNull);
    return schema.anyOf[0] ? resolveSchema(schema.anyOf[0]) : schema;
  }
  if (schema.oneOf) {
    const nonNull = schema.oneOf.find(
      (s) => s.type !== 'null' && !(Array.isArray(s.type) && s.type.includes('null'))
    );
    if (nonNull) return resolveSchema(nonNull);
    return schema.oneOf[0] ? resolveSchema(schema.oneOf[0]) : schema;
  }
  if (schema.allOf && schema.allOf.length === 1) {
    return resolveSchema(schema.allOf[0]);
  }
  return schema;
};

const getSchemaNode = (path: Array<string | number>): JsonSchema | undefined => {
  let current: JsonSchema = getJsonSchema();

  for (const segment of path) {
    current = resolveSchema(current);

    if (typeof segment === 'number') {
      if (current.items) {
        current = current.items;
        continue;
      }
      return undefined;
    }

    if (current.properties && segment in current.properties) {
      current = current.properties[segment];
      continue;
    }

    return undefined;
  }

  return current;
};

const getSchemaType = (schema: JsonSchema): SchemaPropertyInfo['type'] => {
  const resolved = resolveSchema(schema);
  const type = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type;

  switch (type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    default:
      return 'unknown';
  }
};

const getSchemaProperties = (path: string[]): SchemaPropertyInfo[] => {
  const node = getSchemaNode(path);
  if (!node) return [];

  const resolved = resolveSchema(node);
  if (!resolved.properties) return [];

  return Object.entries(resolved.properties).map(([key, propSchema]) => {
    const resolvedProp = resolveSchema(propSchema);
    const type = getSchemaType(propSchema);
    const isEnum = Boolean(resolvedProp.enum);
    const enumValues = isEnum ? (resolvedProp.enum as string[]) : undefined;

    return {
      key,
      description: propSchema.description ?? resolvedProp.description,
      type,
      isEnum,
      enumValues,
    };
  });
};

const getSchemaDescription = (path: string[]): string | undefined => {
  const node = getSchemaNode(path);
  if (!node) return undefined;
  const resolved = resolveSchema(node);
  return node.description ?? resolved.description;
};

const getSchemaTypeInfo = (
  path: string[]
): { type: string; isBoolean: boolean; enumValues?: string[] } | undefined => {
  const node = getSchemaNode(path);
  if (!node) return undefined;

  const resolved = resolveSchema(node);
  const type = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type;

  if (type === 'boolean') {
    return { type: 'boolean', isBoolean: true };
  }
  if (resolved.enum) {
    return { type: 'enum', isBoolean: false, enumValues: resolved.enum as string[] };
  }

  return { type: type ?? 'unknown', isBoolean: false };
};

// ============================================================================
// YAML Utilities
// ============================================================================

const getExistingYamlKeys = (text: string, parentPath: string[]): Set<string> => {
  const keys = new Set<string>();
  const lines = text.split('\n');

  if (parentPath.length === 0) {
    for (const line of lines) {
      const match = /^([A-Za-z0-9_]+)\s*:/.exec(line);
      if (match) {
        keys.add(match[1]);
      }
    }
  } else {
    let parentIndent = -1;
    let inParent = false;

    for (const line of lines) {
      const keyMatch = /^(\s*)([A-Za-z0-9_]+)\s*:/.exec(line);

      if (keyMatch) {
        const key = keyMatch[2];
        const keyIndent = keyMatch[1].length;

        if (!inParent && key === parentPath[parentPath.length - 1] && keyIndent === 0) {
          inParent = true;
          parentIndent = keyIndent;
          continue;
        }

        if (inParent) {
          if (keyIndent <= parentIndent && line.trim() !== '') {
            break;
          }
          if (keyIndent === parentIndent + 2) {
            keys.add(key);
          }
        }
      }
    }
  }

  return keys;
};

const getCompletionContext = (text: string, position: monaco.Position) => {
  const lines = text.split('\n');
  const lineIndex = Math.max(0, position.lineNumber - 1);
  const line = lines[lineIndex] ?? '';
  const indent = line.match(/^\s*/)?.[0].length ?? 0;
  const keyMatch = /^(\s*)([A-Za-z0-9_]+)\s*:(.*)$/.exec(line);

  if (keyMatch) {
    const keyIndent = keyMatch[1].length;
    const key = keyMatch[2];
    const hasValue = keyMatch[3].trim().length > 0;
    const isValuePosition = hasValue || position.column > keyMatch[0].indexOf(':') + 1;
    const parentPath = keyIndent === 0 ? [] : getYamlPathAtPosition(text, position)?.slice(0, -1);
    return {
      parentPath: parentPath ?? [],
      currentKey: key,
      isValuePosition,
    };
  }

  if (indent === 0) {
    return { parentPath: [], currentKey: null, isValuePosition: false };
  }

  for (let i = lineIndex - 1; i >= 0; i--) {
    const match = /^(\s*)([A-Za-z0-9_]+)\s*:/.exec(lines[i]);
    if (!match) {
      continue;
    }
    const parentIndent = match[1].length;
    if (parentIndent < indent) {
      return { parentPath: [match[2]], currentKey: null, isValuePosition: false };
    }
  }

  return { parentPath: [], currentKey: null, isValuePosition: false };
};

const findYamlNodeForPath = (doc: YAML.Document, path: Array<string | number>) => {
  let node: YAML.Node | null | undefined = doc.contents;
  let lastPair: YAML.Pair<YAML.Node, YAML.Node> | null = null;

  for (const segment of path) {
    if (YAML.isMap(node)) {
      const pair = node.items.find(
        (item) => YAML.isScalar(item.key) && item.key.value === segment
      ) as YAML.Pair<YAML.Node, YAML.Node> | undefined;
      if (!pair) {
        return { node: null, pair: null };
      }
      lastPair = pair;
      node = pair.value;
      continue;
    }

    if (YAML.isSeq(node) && typeof segment === 'number') {
      const nextNode = node.items[segment] as YAML.Node | undefined;
      if (!nextNode) {
        return { node: null, pair: null };
      }
      node = nextNode;
      continue;
    }

    return { node: null, pair: null };
  }

  return { node, pair: lastPair };
};

const toMonacoPosition = (linePos: { line: number; col: number }) => {
  return {
    lineNumber: linePos.line > 0 ? linePos.line : 1,
    column: linePos.col > 0 ? linePos.col : 1,
  };
};

const getRangeFromOffsets = (lineCounter: LineCounter, start: number, end: number) => {
  const startPos = toMonacoPosition(lineCounter.linePos(start));
  const endPos = toMonacoPosition(lineCounter.linePos(end));
  return new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column);
};

const buildYamlValidationMarkers = (model: monaco.editor.ITextModel) => {
  const text = model.getValue();
  const lineCounter = new LineCounter();
  const doc = YAML.parseDocument(text, { lineCounter });
  const markers: monaco.editor.IMarkerData[] = [];

  for (const error of doc.errors) {
    const [start, end] = error.pos ?? [0, 0];
    const range = getRangeFromOffsets(lineCounter, start, Math.max(end, start + 1));
    markers.push({
      message: error.message,
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: range.startLineNumber,
      startColumn: range.startColumn,
      endLineNumber: range.endLineNumber,
      endColumn: range.endColumn,
    });
  }

  if (doc.errors.length === 0) {
    const parsed = createRuleDataSchema.safeParse(doc.toJS());
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path as Array<string | number>;
        const { node, pair } = findYamlNodeForPath(doc, path);
        const rangeSource = pair?.key ?? node;
        const range = rangeSource?.range
          ? getRangeFromOffsets(lineCounter, rangeSource.range[0], rangeSource.range[1])
          : getRangeFromOffsets(lineCounter, 0, 1);
        markers.push({
          message: issue.message,
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: range.startLineNumber,
          startColumn: range.startColumn,
          endLineNumber: range.endLineNumber,
          endColumn: range.endColumn,
        });
      }
    }
  }

  monaco.editor.setModelMarkers(model, 'alertingV2YamlSchema', markers);
};

const getYamlPathAtPosition = (text: string, position: monaco.Position): string[] | null => {
  const lines = text.split('\n');
  const lineIndex = Math.max(0, position.lineNumber - 1);
  const line = lines[lineIndex] ?? '';
  const indent = line.match(/^\s*/)?.[0].length ?? 0;
  const keyMatch = /^\s*([A-Za-z0-9_]+)\s*:/.exec(line);

  if (keyMatch) {
    const key = keyMatch[1];
    if (indent === 0) {
      return [key];
    }
    for (let i = lineIndex - 1; i >= 0; i--) {
      const parentLine = lines[i];
      const parentMatch = /^(\s*)([A-Za-z0-9_]+)\s*:/.exec(parentLine);
      if (!parentMatch) {
        continue;
      }
      const parentIndent = parentMatch[1].length;
      if (parentIndent < indent) {
        return [parentMatch[2], key];
      }
    }
    return [key];
  }

  const cursorOffset = lines.slice(0, lineIndex).reduce((acc, curr) => acc + curr.length + 1, 0);
  const queryContext = findYamlQueryContext(text, cursorOffset + position.column - 1);
  if (queryContext) {
    return ['query'];
  }

  for (let i = lineIndex - 1; i >= 0; i--) {
    const parentLine = lines[i];
    const parentMatch = /^(\s*)([A-Za-z0-9_]+)\s*:/.exec(parentLine);
    if (!parentMatch) {
      continue;
    }
    const parentIndent = parentMatch[1].length;
    if (parentIndent < indent) {
      return [parentMatch[2]];
    }
  }

  return null;
};

// ============================================================================
// ES|QL Query Context Detection
// ============================================================================

const findYamlQueryContext = (text: string, cursorOffset: number): QueryContext | null => {
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

  for (let queryLineIdx = cursorLine; queryLineIdx >= 0; queryLineIdx--) {
    const line = lines[queryLineIdx];
    const queryMatch = /^(\s*)query:\s*(.*)$/.exec(line);
    if (!queryMatch) continue;

    const baseIndent = queryMatch[1].length;
    const afterColon = queryMatch[2] ?? '';
    const trimmedAfterColon = afterColon.trim();

    // Case 1: Block scalar (| or >)
    if (trimmedAfterColon.startsWith('|') || trimmedAfterColon.startsWith('>')) {
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
      const cursorColInLine = Math.max(
        0,
        cursorOffset - lineStartOffsets[cursorLine] - blockIndent
      );
      const offsetBeforeCursorLine = queryLines
        .slice(0, cursorLineInQuery)
        .reduce((acc, l) => acc + l.length + 1, 0);

      return {
        queryText,
        queryOffset: Math.max(
          0,
          Math.min(queryText.length, offsetBeforeCursorLine + cursorColInLine)
        ),
      };
    }

    // Case 2a: Empty value but cursor is on the query line
    if (trimmedAfterColon.length === 0 && cursorLine === queryLineIdx) {
      const colonIdx = line.indexOf(':');
      const valueStartCol = colonIdx + 1;
      const valueStartOffset = lineStartOffsets[queryLineIdx] + valueStartCol;

      if (cursorOffset >= valueStartOffset) {
        return { queryText: '', queryOffset: 0 };
      }
      return null;
    }

    // Case 2b: Inline value (possibly with continuation lines)
    if (trimmedAfterColon.length > 0) {
      const valueStartCol = line.length - afterColon.length;
      const valueStartOffset = lineStartOffsets[queryLineIdx] + valueStartCol;

      const quote = afterColon.startsWith('"') || afterColon.startsWith("'") ? afterColon[0] : null;
      const closingQuoteIdx = quote ? afterColon.lastIndexOf(quote) : -1;
      const queryStartOffset = valueStartOffset + (quote ? 1 : 0);
      const queryEndOffset =
        closingQuoteIdx > 0
          ? valueStartOffset + closingQuoteIdx
          : valueStartOffset + afterColon.length;

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
        queryText,
        queryOffset: Math.max(
          0,
          Math.min(queryText.length, offsetBeforeCursorLine + cursorColInLine)
        ),
      };
    }

    // Case 3: Empty value - check if cursor is on a continuation line
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
      queryText,
      queryOffset: Math.max(
        0,
        Math.min(queryText.length, offsetBeforeCursorLine + cursorColInLine)
      ),
    };
  }

  return null;
};

// ============================================================================
// Monaco Language Registration
// ============================================================================

const ALERTING_V2_YAML_ESQL_LANG_ID = 'alertingV2YamlEsql';

class AlertingYamlState implements monaco.languages.IState {
  constructor(
    public readonly kind: 'none' | 'pending' | 'block' | 'inline',
    public readonly baseIndent: number,
    public readonly blockIndent: number
  ) {}

  clone() {
    return new AlertingYamlState(this.kind, this.baseIndent, this.blockIndent);
  }

  equals(other: monaco.languages.IState) {
    if (!(other instanceof AlertingYamlState)) {
      return false;
    }
    return (
      other.kind === this.kind &&
      other.baseIndent === this.baseIndent &&
      other.blockIndent === this.blockIndent
    );
  }
}

const ensureAlertingYamlLanguage = () => {
  const languages = monaco.languages.getLanguages();
  if (languages.some(({ id }) => id === ALERTING_V2_YAML_ESQL_LANG_ID)) {
    return;
  }

  void ESQLLang.onLanguage?.();

  monaco.languages.register({ id: ALERTING_V2_YAML_ESQL_LANG_ID });
  if (YamlLang.languageConfiguration) {
    monaco.languages.setLanguageConfiguration(
      ALERTING_V2_YAML_ESQL_LANG_ID,
      YamlLang.languageConfiguration
    );
  }

  const normalizeEsqlTokenType = (tokenType: string) => {
    const [base] = tokenType.split('.');
    return base || tokenType;
  };

  const toMonacoTokens = (
    tokens: monaco.Token[] | undefined,
    transform?: (tokenType: string) => string
  ): monaco.languages.IToken[] => {
    if (!tokens) {
      return [];
    }
    return tokens.map((token) => ({
      startIndex: token.offset,
      scopes: transform ? transform(token.type) : token.type,
    }));
  };

  const tokenizeYamlLine = (line: string) => {
    const yamlTokens = monaco.editor.tokenize(line, YAML_LANG_ID)[0];
    return toMonacoTokens(yamlTokens);
  };

  const tokenizeEsqlLine = (line: string, offset: number) => {
    const esqlTokens = monaco.editor.tokenize(line, ESQL_LANG_ID)[0];
    return toMonacoTokens(esqlTokens, normalizeEsqlTokenType).map((token) => ({
      startIndex: token.startIndex + offset,
      scopes: token.scopes,
    }));
  };

  monaco.languages.setTokensProvider(ALERTING_V2_YAML_ESQL_LANG_ID, {
    getInitialState: () => new AlertingYamlState('none', 0, 0),
    tokenize: (line, state) => {
      if (!(state instanceof AlertingYamlState)) {
        return { tokens: tokenizeYamlLine(line), endState: new AlertingYamlState('none', 0, 0) };
      }

      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      const trimmed = line.trim();

      if (state.kind === 'pending') {
        if (trimmed === '') {
          return { tokens: tokenizeYamlLine(line), endState: state };
        }

        if (indent > state.baseIndent) {
          const esqlText = line.slice(indent);
          const tokens = [
            { startIndex: 0, scopes: 'source.yaml' },
            ...tokenizeEsqlLine(esqlText, indent),
          ];
          return {
            tokens,
            endState: new AlertingYamlState('block', state.baseIndent, indent),
          };
        }

        return {
          tokens: tokenizeYamlLine(line),
          endState: new AlertingYamlState('none', 0, 0),
        };
      }

      if (state.kind === 'block') {
        if (trimmed !== '' && indent < state.blockIndent) {
          return {
            tokens: tokenizeYamlLine(line),
            endState: new AlertingYamlState('none', 0, 0),
          };
        }

        const esqlText = indent >= state.blockIndent ? line.slice(state.blockIndent) : '';
        const tokens = [
          { startIndex: 0, scopes: 'source.yaml' },
          ...tokenizeEsqlLine(esqlText, state.blockIndent),
        ];
        return {
          tokens,
          endState: state,
        };
      }

      if (state.kind === 'inline') {
        if (trimmed === '' && indent <= state.baseIndent) {
          return {
            tokens: tokenizeYamlLine(line),
            endState: new AlertingYamlState('none', 0, 0),
          };
        }

        if (trimmed !== '' && indent <= state.baseIndent) {
          return {
            tokens: tokenizeYamlLine(line),
            endState: new AlertingYamlState('none', 0, 0),
          };
        }

        const continuationIndent =
          state.blockIndent > 0 ? state.blockIndent : indent > state.baseIndent ? indent : 0;

        if (continuationIndent === 0) {
          return {
            tokens: tokenizeYamlLine(line),
            endState: new AlertingYamlState('none', 0, 0),
          };
        }

        const esqlText = indent >= continuationIndent ? line.slice(continuationIndent) : '';
        const tokens = [
          { startIndex: 0, scopes: 'source.yaml' },
          ...tokenizeEsqlLine(esqlText, continuationIndent),
        ];
        return {
          tokens,
          endState: new AlertingYamlState('inline', state.baseIndent, continuationIndent),
        };
      }

      const queryMatch = /^(\s*)(query)(:)\s*(.*)$/.exec(line);
      if (!queryMatch) {
        return { tokens: tokenizeYamlLine(line), endState: state };
      }

      const baseIndent = queryMatch[1].length;
      const keyStart = baseIndent;
      const keyEnd = keyStart + queryMatch[2].length;
      const colonPos = keyEnd;
      const value = queryMatch[4] ?? '';
      const valueStartIndex = colonPos + 1 + (line.slice(colonPos + 1).length - value.length);
      const trimmedValue = value.trim();

      const baseTokens: monaco.languages.IToken[] = [
        { startIndex: 0, scopes: 'source.yaml' },
        { startIndex: keyStart, scopes: 'type.yaml' },
        { startIndex: colonPos, scopes: 'operators.yaml' },
      ];

      if (trimmedValue.startsWith('>') || trimmedValue.startsWith('|')) {
        const yamlTokens = tokenizeYamlLine(line);
        return {
          tokens: yamlTokens,
          endState: new AlertingYamlState('pending', baseIndent, 0),
        };
      }

      if (trimmedValue.length > 0) {
        const rawValue = value.trimStart();
        const rawValueOffset = valueStartIndex + (value.length - rawValue.length);
        const quote = rawValue.startsWith('"') || rawValue.startsWith("'") ? rawValue[0] : null;
        const closingIndex = quote ? rawValue.lastIndexOf(quote) : rawValue.length;
        const queryText = rawValue.slice(
          quote ? 1 : 0,
          closingIndex > 0 ? closingIndex : undefined
        );
        const queryOffset = rawValueOffset + (quote ? 1 : 0);
        const tokens = [...baseTokens, ...tokenizeEsqlLine(queryText, queryOffset)];
        return { tokens, endState: new AlertingYamlState('inline', baseIndent, 0) };
      }

      return { tokens: baseTokens, endState: new AlertingYamlState('pending', baseIndent, 0) };
    },
  });
};

// Initialize language on module load
ensureAlertingYamlLanguage();

// ============================================================================
// Completion Items Conversion
// ============================================================================

const toCompletionItems = (
  suggestions: Array<{
    label: string;
    text: string;
    asSnippet?: boolean;
    kind?: string;
    detail?: string;
    documentation?: string | { value: string };
    sortText?: string;
    filterText?: string;
  }>,
  range: monaco.Range
): monaco.languages.CompletionItem[] => {
  return suggestions.map((item) => {
    const kind =
      item.kind && item.kind in monaco.languages.CompletionItemKind
        ? monaco.languages.CompletionItemKind[
            item.kind as keyof typeof monaco.languages.CompletionItemKind
          ]
        : monaco.languages.CompletionItemKind.Method;
    return {
      label: item.label,
      insertText: item.text,
      filterText: item.filterText,
      kind,
      detail: item.detail,
      documentation: item.documentation,
      sortText: item.sortText,
      insertTextRules: item.asSnippet
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
      range,
    };
  });
};

// ============================================================================
// YamlRuleEditor Component
// ============================================================================

export const YamlRuleEditor: React.FC<YamlRuleEditorProps> = ({
  value,
  onChange,
  esqlCallbacks,
  isReadOnly = false,
  height = 320,
  dataTestSubj = 'alertingV2YamlRuleEditor',
}) => {
  const editorSuggestDisposable = useRef<monaco.IDisposable | null>(null);
  const editorValidationDisposable = useRef<monaco.IDisposable | null>(null);

  const suggestionProvider = useMemo<monaco.languages.CompletionItemProvider>(
    () => ({
      triggerCharacters: [...ESQL_AUTOCOMPLETE_TRIGGER_CHARS, ':', ' '],
      provideCompletionItems: async (model, position) => {
        const fullText = model.getValue();
        const cursorOffset = model.getOffsetAt(position);
        const queryContext = findYamlQueryContext(fullText, cursorOffset);

        const word = model.getWordUntilPosition(position);
        const range = new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        );

        if (queryContext) {
          const suggestions = await suggest(
            queryContext.queryText,
            queryContext.queryOffset,
            esqlCallbacks
          );
          return {
            suggestions: toCompletionItems(suggestions, range),
          };
        }

        const completionContext = getCompletionContext(fullText, position);
        if (!completionContext) {
          return { suggestions: [] };
        }

        if (completionContext.isValuePosition && completionContext.currentKey) {
          const typeInfo = getSchemaTypeInfo([
            ...completionContext.parentPath,
            completionContext.currentKey,
          ]);
          if (typeInfo?.isBoolean) {
            return {
              suggestions: ['true', 'false'].map((val) => ({
                label: val,
                insertText: val,
                kind: monaco.languages.CompletionItemKind.Value,
                range,
              })),
            };
          }
          if (typeInfo?.enumValues) {
            return {
              suggestions: typeInfo.enumValues.map((val) => ({
                label: val,
                insertText: val,
                kind: monaco.languages.CompletionItemKind.Value,
                range,
              })),
            };
          }
          return { suggestions: [] };
        }

        const properties = getSchemaProperties(completionContext.parentPath);
        const existingKeys = getExistingYamlKeys(fullText, completionContext.parentPath);

        return {
          suggestions: properties
            .filter(({ key }) => !existingKeys.has(key))
            .map(({ key, description }) => ({
              label: key,
              insertText: `${key}: `,
              kind: monaco.languages.CompletionItemKind.Property,
              documentation: description ? { value: description } : undefined,
              range,
            })),
        };
      },
    }),
    [esqlCallbacks]
  );

  const hoverProvider = useMemo<monaco.languages.HoverProvider>(
    () => ({
      provideHover: (model, position) => {
        const path = getYamlPathAtPosition(model.getValue(), position);
        if (!path) {
          return null;
        }
        const description = getSchemaDescription(path);
        if (!description) {
          return null;
        }
        return {
          contents: [{ value: description }],
        };
      },
    }),
    []
  );

  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const model = editor.getModel();
    if (!model) {
      return;
    }

    // Force tokenization on initial render for the custom YAML+ESQL language
    monaco.editor.setModelLanguage(model, YAML_LANG_ID);
    monaco.editor.setModelLanguage(model, ALERTING_V2_YAML_ESQL_LANG_ID);

    editorSuggestDisposable.current?.dispose();
    editorSuggestDisposable.current = editor.onDidChangeModelContent(() => {
      const position = editor.getPosition();
      const currentModel = editor.getModel();
      if (!position || !currentModel) {
        return;
      }
      const offset = currentModel.getOffsetAt(position);
      if (findYamlQueryContext(currentModel.getValue(), offset)) {
        editor.trigger('alerting_v2', 'editor.action.triggerSuggest', null);
      }
    });

    buildYamlValidationMarkers(model);
    editorValidationDisposable.current?.dispose();
    editorValidationDisposable.current = editor.onDidChangeModelContent(() => {
      buildYamlValidationMarkers(model);
    });
  }, []);

  const handleEditorWillUnmount = useCallback(() => {
    editorSuggestDisposable.current?.dispose();
    editorSuggestDisposable.current = null;
    editorValidationDisposable.current?.dispose();
    editorValidationDisposable.current = null;
  }, []);

  return (
    <CodeEditorField
      value={value}
      onChange={onChange}
      languageId={ALERTING_V2_YAML_ESQL_LANG_ID}
      editorDidMount={handleEditorDidMount}
      editorWillUnmount={handleEditorWillUnmount}
      height={height}
      fullWidth
      dataTestSubj={dataTestSubj}
      suggestionProvider={suggestionProvider}
      hoverProvider={hoverProvider}
      options={{
        minimap: { enabled: false },
        wordWrap: 'on',
        lineNumbers: 'on',
        readOnly: isReadOnly,
      }}
    />
  );
};
