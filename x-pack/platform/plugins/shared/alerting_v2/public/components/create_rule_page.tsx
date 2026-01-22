/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import { CodeEditorField } from '@kbn/code-editor';
import {
  ESQL_AUTOCOMPLETE_TRIGGER_CHARS,
  ESQL_LANG_ID,
  ESQLLang,
  monaco,
  YamlLang,
  YAML_LANG_ID,
} from '@kbn/monaco';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { getESQLSources, getEsqlColumns } from '@kbn/esql-utils';
import { suggest } from '@kbn/esql-language';
import { FormattedMessage } from '@kbn/i18n-react';
import { dump, load } from 'js-yaml';
import { useHistory, useParams } from 'react-router-dom';
import YAML, { LineCounter } from 'yaml';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createRuleDataSchema } from '../../common/schemas/create_rule_data_schema';
import type { CreateRuleData } from '../../common/types';
import { RulesApi } from '../services/rules_api';

const DEFAULT_RULE_YAML = `name: Example rule
tags: []
schedule:
  custom: 1m
enabled: true
query: FROM logs-* | LIMIT 1
timeField: "@timestamp"
lookbackWindow: 5m
groupingKey: []`;

const DEFAULT_RULE_VALUES: CreateRuleData = {
  name: 'Example rule',
  tags: [],
  schedule: { custom: '1m' },
  enabled: true,
  query: 'FROM logs-* | LIMIT 1',
  timeField: '@timestamp',
  lookbackWindow: '5m',
  groupingKey: [],
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const parseYaml = (value: string): Record<string, unknown> | null => {
  try {
    const result = load(value);
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return null;
    }
    return result as Record<string, unknown>;
  } catch {
    return null;
  }
};

interface QueryContext {
  queryText: string;
  queryOffset: number;
}

// Schema property info extracted from JSON schema
interface SchemaPropertyInfo {
  key: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'unknown';
  isEnum?: boolean;
  enumValues?: string[];
}

// JSON Schema types
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

// Convert Zod schema to JSON Schema (cached)
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

// Resolve anyOf/oneOf to get the actual schema (handles optionals, unions, etc.)
const resolveSchema = (schema: JsonSchema): JsonSchema => {
  if (schema.anyOf) {
    // Find non-null type in anyOf (for optionals)
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

// Get JSON schema node at path
const getSchemaNode = (path: Array<string | number>): JsonSchema | undefined => {
  let current: JsonSchema = getJsonSchema();

  for (const segment of path) {
    current = resolveSchema(current);

    if (typeof segment === 'number') {
      // Array index
      if (current.items) {
        current = current.items;
        continue;
      }
      return undefined;
    }

    // Object property
    if (current.properties && segment in current.properties) {
      current = current.properties[segment];
      continue;
    }

    return undefined;
  }

  return current;
};

// Get type from JSON schema
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

// Get properties from JSON schema at path
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

// Get schema description at path
const getSchemaDescription = (path: string[]): string | undefined => {
  const node = getSchemaNode(path);
  if (!node) return undefined;
  const resolved = resolveSchema(node);
  return node.description ?? resolved.description;
};

// Get schema type info at path (for value completions)
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

// Get existing keys from YAML text at a given indent level
const getExistingYamlKeys = (text: string, parentPath: string[]): Set<string> => {
  const keys = new Set<string>();
  const lines = text.split('\n');

  if (parentPath.length === 0) {
    // Root level - get all top-level keys
    for (const line of lines) {
      const match = /^([A-Za-z0-9_]+)\s*:/.exec(line);
      if (match) {
        keys.add(match[1]);
      }
    }
  } else {
    // Nested level - find parent and get its children
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
            break; // Exited parent scope
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

      // Build tokens: key gets 'type.yaml' (same as other YAML keys), colon gets punctuation
      const baseTokens: monaco.languages.IToken[] = [
        { startIndex: 0, scopes: 'source.yaml' },
        { startIndex: keyStart, scopes: 'type.yaml' }, // "query" highlighted as YAML key
        { startIndex: colonPos, scopes: 'operators.yaml' }, // ":" highlighted as operator
      ];

      if (trimmedValue.startsWith('>') || trimmedValue.startsWith('|')) {
        // Block scalar indicator - tokenize as YAML
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

ensureAlertingYamlLanguage();

/**
 * Find the ES|QL query context at the cursor position.
 * Handles inline queries, block scalar queries (| or >), and multi-line continuation.
 */
const findYamlQueryContext = (text: string, cursorOffset: number): QueryContext | null => {
  const lines = text.split('\n');

  // Build line start offsets and find cursor line
  const lineStartOffsets: number[] = [];
  let runningOffset = 0;
  let cursorLine = 0;

  for (let i = 0; i < lines.length; i++) {
    lineStartOffsets.push(runningOffset);
    if (cursorOffset >= runningOffset && cursorOffset <= runningOffset + lines[i].length) {
      cursorLine = i;
    }
    runningOffset += lines[i].length + 1; // +1 for newline
  }

  // Search backwards for the `query:` key
  for (let queryLineIdx = cursorLine; queryLineIdx >= 0; queryLineIdx--) {
    const line = lines[queryLineIdx];
    const queryMatch = /^(\s*)query:\s*(.*)$/.exec(line);
    if (!queryMatch) continue;

    const baseIndent = queryMatch[1].length;
    const afterColon = queryMatch[2] ?? '';
    const trimmedAfterColon = afterColon.trim();

    // Case 1: Block scalar (| or >)
    if (trimmedAfterColon.startsWith('|') || trimmedAfterColon.startsWith('>')) {
      // Find the block indent from first content line
      let blockIndent = 0;
      for (let j = queryLineIdx + 1; j < lines.length; j++) {
        if (lines[j].trim() === '') continue;
        const lineIndent = lines[j].match(/^\s*/)?.[0].length ?? 0;
        if (lineIndent > baseIndent) {
          blockIndent = lineIndent;
        }
        break;
      }

      // If no content yet, use cursor indent or default
      if (blockIndent === 0) {
        if (cursorLine <= queryLineIdx) return null;
        const cursorIndent = lines[cursorLine].match(/^\s*/)?.[0].length ?? 0;
        blockIndent = Math.max(baseIndent + 2, cursorIndent);
      }

      // Find end of block
      let endLine = queryLineIdx + 1;
      while (endLine < lines.length) {
        const lineIndent = lines[endLine].match(/^\s*/)?.[0].length ?? 0;
        if (lines[endLine].trim() !== '' && lineIndent < blockIndent) break;
        endLine++;
      }

      // Check if cursor is in the block
      if (cursorLine <= queryLineIdx || cursorLine >= endLine) return null;

      // Extract query lines
      const queryLines = lines
        .slice(queryLineIdx + 1, endLine)
        .map((lineText) => (lineText.length >= blockIndent ? lineText.slice(blockIndent) : ''));
      const queryText = queryLines.join('\n');

      // Calculate offset within query
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

    // Case 2a: Empty value but cursor is on the query line (e.g., "query: " with cursor after colon)
    if (trimmedAfterColon.length === 0 && cursorLine === queryLineIdx) {
      // Find where the cursor would be relative to where a value would start
      const colonIdx = line.indexOf(':');
      const valueStartCol = colonIdx + 1;
      const valueStartOffset = lineStartOffsets[queryLineIdx] + valueStartCol;

      // Cursor must be at or after the colon
      if (cursorOffset >= valueStartOffset) {
        return {
          queryText: '',
          queryOffset: 0,
        };
      }
      return null;
    }

    // Case 2b: Inline value (possibly with continuation lines)
    if (trimmedAfterColon.length > 0) {
      // afterColon is already trimmed of leading whitespace by the regex's \s*
      // So we calculate position by finding where afterColon starts in the line
      const valueStartCol = line.length - afterColon.length;
      const valueStartOffset = lineStartOffsets[queryLineIdx] + valueStartCol;

      // Handle quoted strings
      const quote = afterColon.startsWith('"') || afterColon.startsWith("'") ? afterColon[0] : null;
      const closingQuoteIdx = quote ? afterColon.lastIndexOf(quote) : -1;
      const queryStartOffset = valueStartOffset + (quote ? 1 : 0);
      const queryEndOffset =
        closingQuoteIdx > 0
          ? valueStartOffset + closingQuoteIdx
          : valueStartOffset + afterColon.length;

      // Check for multi-line continuation
      let continuationIndent = 0;
      for (let j = queryLineIdx + 1; j < lines.length; j++) {
        if (lines[j].trim() === '') continue;
        const lineIndent = lines[j].match(/^\s*/)?.[0].length ?? 0;
        if (lineIndent > baseIndent) {
          continuationIndent = lineIndent;
        }
        break;
      }

      // Single line query (no continuation)
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

      // Multi-line with continuation
      let endLine = queryLineIdx + 1;
      while (endLine < lines.length) {
        const lineIndent = lines[endLine].match(/^\s*/)?.[0].length ?? 0;
        if (lines[endLine].trim() !== '' && lineIndent <= baseIndent) break;
        endLine++;
      }

      if (cursorLine < queryLineIdx || cursorLine >= endLine) return null;

      // Build query text
      const firstLineText = afterColon.slice(
        quote ? 1 : 0,
        closingQuoteIdx > 0 ? closingQuoteIdx : undefined
      );
      const continuationLines = lines.slice(queryLineIdx + 1, endLine).map((lineText) => {
        const lineIndent = lineText.match(/^\s*/)?.[0].length ?? 0;
        return lineIndent >= continuationIndent ? lineText.slice(continuationIndent) : '';
      });
      const queryText = [firstLineText, ...continuationLines].join('\n');

      // Calculate offset
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

    // Find block indent from subsequent lines
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

    // Find end of block
    let endLine = queryLineIdx + 1;
    while (endLine < lines.length) {
      const lineIndent = lines[endLine].match(/^\s*/)?.[0].length ?? 0;
      if (lines[endLine].trim() !== '' && lineIndent < blockIndent) break;
      endLine++;
    }

    if (cursorLine >= endLine) return null;

    // Extract query
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

export const CreateRulePage = () => {
  const { id: ruleId } = useParams<{ id?: string }>();
  const isEditing = Boolean(ruleId);
  const history = useHistory();
  const rulesApi = useService(RulesApi);
  const http = useService(CoreStart('http'));
  const application = useService(CoreStart('application'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const editorSuggestDisposable = useRef<monaco.IDisposable | null>(null);
  const editorValidationDisposable = useRef<monaco.IDisposable | null>(null);
  const [yaml, setYaml] = useState(DEFAULT_RULE_YAML);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [errorTitle, setErrorTitle] = useState<React.ReactNode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRule, setIsLoadingRule] = useState(false);

  const parsedDoc = useMemo(() => parseYaml(yaml), [yaml]);

  const esqlCallbacks = useMemo<ESQLCallbacks>(
    () => ({
      getSources: async () => getESQLSources({ application, http }, undefined),
      getColumnsFor: async ({ query }: { query?: string } | undefined = {}) =>
        getEsqlColumns({ esqlQuery: query, search: data.search.search }),
    }),
    [application, http, data.search.search]
  );

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
              suggestions: ['true', 'false'].map((value) => ({
                label: value,
                insertText: value,
                kind: monaco.languages.CompletionItemKind.Value,
                range,
              })),
            };
          }
          if (typeInfo?.enumValues) {
            return {
              suggestions: typeInfo.enumValues.map((value) => ({
                label: value,
                insertText: value,
                kind: monaco.languages.CompletionItemKind.Value,
                range,
              })),
            };
          }
          return { suggestions: [] };
        }

        // Get schema properties and filter out keys that are already present
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

  useEffect(() => {
    if (!ruleId) {
      return;
    }

    let cancelled = false;
    const loadRule = async () => {
      setIsLoadingRule(true);
      setError(null);
      setErrorTitle(null);

      try {
        const rule = await rulesApi.getRule(ruleId);
        if (cancelled) {
          return;
        }

        const nextPayload: CreateRuleData = {
          ...DEFAULT_RULE_VALUES,
          name: rule.name,
          tags: rule.tags ?? DEFAULT_RULE_VALUES.tags,
          schedule: rule.schedule?.custom
            ? { custom: rule.schedule.custom }
            : DEFAULT_RULE_VALUES.schedule,
          enabled: rule.enabled ?? DEFAULT_RULE_VALUES.enabled,
          query: rule.query ?? DEFAULT_RULE_VALUES.query,
          timeField: rule.timeField ?? DEFAULT_RULE_VALUES.timeField,
          lookbackWindow: rule.lookbackWindow ?? DEFAULT_RULE_VALUES.lookbackWindow,
          groupingKey: rule.groupingKey ?? DEFAULT_RULE_VALUES.groupingKey,
        };

        setYaml(dump(nextPayload, { lineWidth: 120, noRefs: true }));
      } catch (err) {
        if (!cancelled) {
          setErrorTitle(
            <FormattedMessage
              id="xpack.alertingV2.createRule.loadErrorTitle"
              defaultMessage="Failed to load rule"
            />
          );
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRule(false);
        }
      }
    };

    loadRule();

    return () => {
      cancelled = true;
    };
  }, [ruleId, rulesApi]);

  const onSave = async () => {
    setIsSubmitting(true);
    setError(null);
    setErrorTitle(null);

    try {
      if (!parsedDoc) {
        setErrorTitle(
          <FormattedMessage
            id="xpack.alertingV2.createRule.invalidYamlTitle"
            defaultMessage="Invalid YAML"
          />
        );
        setError(
          <FormattedMessage
            id="xpack.alertingV2.createRule.invalidYaml"
            defaultMessage="YAML must define an object with rule fields."
          />
        );
        setIsSubmitting(false);
        return;
      }

      const validated = createRuleDataSchema.safeParse(parsedDoc);
      if (!validated.success) {
        setErrorTitle(
          <FormattedMessage
            id="xpack.alertingV2.createRule.validationTitle"
            defaultMessage="Rule validation failed"
          />
        );
        setError(validated.error.message);
        setIsSubmitting(false);
        return;
      }

      if (isEditing && ruleId) {
        await rulesApi.updateRule(ruleId, validated.data);
      } else {
        await rulesApi.createRule(validated.data);
      }

      history.push('/');
    } catch (err) {
      setErrorTitle(
        <FormattedMessage
          id="xpack.alertingV2.createRule.saveErrorTitle"
          defaultMessage="Failed to save rule"
        />
      );
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <EuiPageHeader
        pageTitle={
          isEditing ? (
            <FormattedMessage
              id="xpack.alertingV2.createRule.editPageTitle"
              defaultMessage="Edit rule"
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.createRule.pageTitle"
              defaultMessage="Create rule"
            />
          )
        }
      />
      <EuiSpacer size="m" />
      <EuiForm component="form" fullWidth>
        {error ? (
          <>
            <EuiCallOut
              title={
                errorTitle ?? (
                  <FormattedMessage
                    id="xpack.alertingV2.createRule.errorTitle"
                    defaultMessage="Failed to create rule"
                  />
                )
              }
              color="danger"
              iconType="error"
              announceOnMount
            >
              {error}
            </EuiCallOut>
            <EuiSpacer />
          </>
        ) : null}
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.alertingV2.createRule.yamlLabel"
              defaultMessage="Rule definition (YAML)"
            />
          }
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.alertingV2.createRule.yamlHelpText"
              defaultMessage="Paste the rule payload as YAML. ES|QL autocomplete is available within the query field."
            />
          }
        >
          <CodeEditorField
            value={yaml}
            onChange={(value) => setYaml(value)}
            languageId={ALERTING_V2_YAML_ESQL_LANG_ID}
            editorDidMount={(editor) => {
              const model = editor.getModel();
              if (!model) {
                return;
              }
              // Force tokenization on initial render for the custom YAML+ESQL language.
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
            }}
            editorWillUnmount={() => {
              editorSuggestDisposable.current?.dispose();
              editorSuggestDisposable.current = null;
              editorValidationDisposable.current?.dispose();
              editorValidationDisposable.current = null;
            }}
            height={320}
            fullWidth
            dataTestSubj="alertingV2CreateRuleYaml"
            suggestionProvider={suggestionProvider}
            hoverProvider={hoverProvider}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'on',
              readOnly: isLoadingRule || isSubmitting,
            }}
          />
        </EuiFormRow>
        <EuiSpacer />
        <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onSave}
              isLoading={isSubmitting}
              fill
              data-test-subj="alertingV2CreateRuleSubmit"
            >
              {isEditing ? (
                <FormattedMessage
                  id="xpack.alertingV2.createRule.saveLabel"
                  defaultMessage="Save changes"
                />
              ) : (
                <FormattedMessage
                  id="xpack.alertingV2.createRule.submitLabel"
                  defaultMessage="Create rule"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => history.push('/')} data-test-subj="cancelCreateRule">
              <FormattedMessage
                id="xpack.alertingV2.createRule.cancelLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </>
  );
};
