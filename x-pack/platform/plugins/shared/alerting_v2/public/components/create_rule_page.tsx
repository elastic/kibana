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
import { zodToJsonSchema } from 'zod-to-json-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { dump, load } from 'js-yaml';
import { useHistory, useParams } from 'react-router-dom';
import YAML, { LineCounter } from 'yaml';
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

const createRuleJsonSchema = zodToJsonSchema(createRuleDataSchema, {
  name: 'CreateRuleData',
  $refStrategy: 'none',
});

const resolveSchemaRef = (schema: any, ref?: string) => {
  if (!ref || !schema || typeof schema !== 'object') {
    return schema;
  }
  if (!ref.startsWith('#/')) {
    return schema;
  }
  const path = ref
    .slice(2)
    .split('/')
    .map((segment) => decodeURIComponent(segment));
  let current = schema;
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return schema;
    }
    current = current[segment];
  }
  return current ?? schema;
};

const getRootSchema = () => {
  const definitionsRoot = createRuleJsonSchema.definitions?.CreateRuleData;
  if (definitionsRoot) {
    return definitionsRoot;
  }
  const schemaWithRef = createRuleJsonSchema as { $ref?: string };
  if (schemaWithRef.$ref) {
    return resolveSchemaRef(createRuleJsonSchema, schemaWithRef.$ref);
  }
  return createRuleJsonSchema;
};

const getSchemaNode = (path: Array<string | number>) => {
  let current: any = getRootSchema();
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    if (current.$ref) {
      current = resolveSchemaRef(createRuleJsonSchema, current.$ref);
    }
    if (typeof segment === 'number') {
      current = current.items;
      continue;
    }
    current = current.properties?.[segment];
  }
  if (current?.$ref) {
    return resolveSchemaRef(createRuleJsonSchema, current.$ref);
  }
  return current;
};

const getSchemaDescription = (path: string[]) => {
  return getSchemaNode(path)?.description as string | undefined;
};

const getSchemaProperties = (path: string[]) => {
  const node = getSchemaNode(path);
  if (!node || typeof node !== 'object') {
    return [];
  }
  return Object.entries(node.properties ?? {}).map(([key, value]) => ({
    key,
    schema: value as { description?: string; type?: string },
  }));
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

      const queryMatch = /^(\s*)query:\s*(.*)$/.exec(line);
      if (!queryMatch) {
        return { tokens: tokenizeYamlLine(line), endState: state };
      }

      const baseIndent = queryMatch[1].length;
      const value = queryMatch[2] ?? '';
      const valueStartIndex = line.indexOf(value);
      const valueStartOffset = Math.max(valueStartIndex, 0);
      const trimmedValue = value.trim();

      if (trimmedValue.startsWith('>') || trimmedValue.startsWith('|')) {
        return {
          tokens: tokenizeYamlLine(line),
          endState: new AlertingYamlState('pending', baseIndent, 0),
        };
      }

      if (trimmedValue.length > 0) {
        const rawValue = value.trimStart();
        const rawValueOffset = valueStartOffset + (value.length - rawValue.length);
        const quote = rawValue.startsWith('"') || rawValue.startsWith("'") ? rawValue[0] : null;
        const closingIndex = quote ? rawValue.lastIndexOf(quote) : rawValue.length;
        const queryText = rawValue.slice(
          quote ? 1 : 0,
          closingIndex > 0 ? closingIndex : undefined
        );
        const queryOffset = rawValueOffset + (quote ? 1 : 0);
        const tokens = [
          { startIndex: 0, scopes: 'source.yaml' },
          ...tokenizeEsqlLine(queryText, queryOffset),
        ];
        return { tokens, endState: new AlertingYamlState('inline', baseIndent, 0) };
      }

      return { tokens: tokenizeYamlLine(line), endState: state };
    },
  });
};

ensureAlertingYamlLanguage();

const findYamlQueryContext = (text: string, cursorOffset: number): QueryContext | null => {
  const lines = text.split('\n');
  const lineStartOffsets: number[] = [];
  let runningOffset = 0;
  let cursorLine = 0;

  for (let i = 0; i < lines.length; i++) {
    lineStartOffsets.push(runningOffset);
    const nextOffset = runningOffset + lines[i].length + 1;
    if (cursorOffset < nextOffset) {
      cursorLine = i;
    }
    runningOffset = nextOffset;
  }

  for (let i = cursorLine; i >= 0; i--) {
    const line = lines[i];
    const match = /^(\s*)query:\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }

    const baseIndent = match[1].length;
    const value = match[2] ?? '';
    const valueStartIndex = line.indexOf(value);
    const valueStartOffset = lineStartOffsets[i] + Math.max(valueStartIndex, 0);

    if (value.trim().length > 0 && !/^[>|]/.test(value.trim())) {
      const rawValue = value.trimStart();
      const rawValueOffset = valueStartOffset + (value.length - rawValue.length);
      const quote = rawValue.startsWith('"') || rawValue.startsWith("'") ? rawValue[0] : null;
      const closingIndex = quote ? rawValue.lastIndexOf(quote) : rawValue.length;
      const queryStartOffset = rawValueOffset + (quote ? 1 : 0);
      const queryEndOffset =
        closingIndex > 0 ? rawValueOffset + closingIndex : rawValueOffset + rawValue.length;

      let continuationIndent = 0;
      for (let j = i + 1; j < lines.length; j++) {
        const trimmedLine = lines[j].trim();
        if (trimmedLine === '') {
          continue;
        }
        const indent = lines[j].match(/^\s*/)?.[0].length ?? 0;
        if (indent > baseIndent) {
          continuationIndent = indent;
        }
        break;
      }

      if (continuationIndent === 0) {
        if (cursorOffset < queryStartOffset || cursorOffset > queryEndOffset) {
          return null;
        }
        const queryText = rawValue.slice(
          quote ? 1 : 0,
          closingIndex > 0 ? closingIndex : undefined
        );
        const queryOffset = Math.max(
          0,
          Math.min(queryText.length, cursorOffset - queryStartOffset)
        );
        return { queryText, queryOffset };
      }

      let endLine = i + 1;
      while (endLine < lines.length) {
        const lineIndent = lines[endLine].match(/^\s*/)?.[0].length ?? 0;
        if (lines[endLine].trim() !== '' && lineIndent <= baseIndent) {
          break;
        }
        endLine += 1;
      }

      const firstLineQueryText = rawValue.slice(
        quote ? 1 : 0,
        closingIndex > 0 ? closingIndex : undefined
      );
      const continuationLines = lines.slice(i + 1, endLine).map((lineText) => {
        const lineIndent = lineText.match(/^\s*/)?.[0].length ?? 0;
        if (lineIndent > baseIndent) {
          const sliceIndent = Math.min(continuationIndent, lineIndent);
          return lineText.slice(sliceIndent);
        }
        return '';
      });
      const queryText = [firstLineQueryText, ...continuationLines].join('\n');

      if (cursorLine < i || cursorLine >= endLine) {
        return null;
      }

      if (cursorLine === i) {
        if (cursorOffset < queryStartOffset) {
          return null;
        }
        const queryOffset = Math.max(
          0,
          Math.min(firstLineQueryText.length, cursorOffset - queryStartOffset)
        );
        return { queryText, queryOffset };
      }

      const cursorLineOffset = cursorOffset - lineStartOffsets[cursorLine];
      const cursorOffsetInQueryLine = Math.max(0, cursorLineOffset - continuationIndent);
      const lineOffsetInQuery =
        firstLineQueryText.length +
        1 +
        continuationLines
          .slice(0, cursorLine - (i + 1))
          .reduce((acc, curr) => acc + curr.length + 1, 0) +
        cursorOffsetInQueryLine;

      return {
        queryText,
        queryOffset: Math.max(0, Math.min(queryText.length, lineOffsetInQuery)),
      };
    }

    if (i + 1 >= lines.length) {
      return null;
    }

    let blockIndent = 0;
    let firstContentLine = -1;
    for (let j = i + 1; j < lines.length; j++) {
      const trimmedLine = lines[j].trim();
      if (trimmedLine === '') {
        continue;
      }
      const indent = lines[j].match(/^\s*/)?.[0].length ?? 0;
      if (indent > baseIndent) {
        blockIndent = indent;
        firstContentLine = j;
      }
      break;
    }

    if (blockIndent === 0) {
      if (cursorLine <= i) {
        return null;
      }
      const cursorIndent = lines[cursorLine].match(/^\s*/)?.[0].length ?? 0;
      blockIndent = Math.max(baseIndent + 1, cursorIndent);
      firstContentLine = i + 1;
    }

    let endLine = firstContentLine;
    while (endLine < lines.length) {
      const lineIndent = lines[endLine].match(/^\s*/)?.[0].length ?? 0;
      if (lines[endLine].trim() !== '' && lineIndent < blockIndent) {
        break;
      }
      endLine += 1;
    }

    const queryLines = lines.slice(i + 1, endLine).map((lineText) => {
      if (lineText.length >= blockIndent) {
        return lineText.slice(blockIndent);
      }
      return '';
    });

    const queryText = queryLines.join('\n');
    if (cursorLine < i + 1 || cursorLine >= endLine) {
      return null;
    }

    const cursorLineOffset = cursorOffset - lineStartOffsets[cursorLine];
    const cursorOffsetInQueryLine = Math.max(0, cursorLineOffset - blockIndent);

    const lineOffsetInQuery =
      queryLines.slice(0, cursorLine - (i + 1)).reduce((acc, curr) => acc + curr.length + 1, 0) +
      cursorOffsetInQueryLine;

    return {
      queryText,
      queryOffset: Math.max(0, Math.min(queryText.length, lineOffsetInQuery)),
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
          const schemaNode = getSchemaNode([
            ...completionContext.parentPath,
            completionContext.currentKey,
          ]) as { type?: string; enum?: string[] } | undefined;
          if (schemaNode?.type === 'boolean') {
            return {
              suggestions: ['true', 'false'].map((value) => ({
                label: value,
                insertText: value,
                kind: monaco.languages.CompletionItemKind.Value,
                range,
              })),
            };
          }
          if (schemaNode?.enum) {
            return {
              suggestions: schemaNode.enum.map((value) => ({
                label: value,
                insertText: value,
                kind: monaco.languages.CompletionItemKind.Value,
                range,
              })),
            };
          }
          return { suggestions: [] };
        }

        const properties = getSchemaProperties(completionContext.parentPath);
        return {
          suggestions: properties.map(({ key, schema }) => ({
            label: key,
            insertText: `${key}: `,
            kind: monaco.languages.CompletionItemKind.Property,
            documentation: schema.description ? { value: schema.description } : undefined,
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
