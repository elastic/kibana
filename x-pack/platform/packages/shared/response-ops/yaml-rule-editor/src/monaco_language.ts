/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_LANG_ID, ESQLLang, monaco, YamlLang, YAML_LANG_ID } from '@kbn/monaco';
import { DEFAULT_ESQL_PROPERTY_NAMES } from './types';

/**
 * Custom language ID for YAML with embedded ES|QL
 */
export const ALERTING_V2_YAML_ESQL_LANG_ID = 'alertingV2YamlEsql';

/**
 * Module-level configuration for ES|QL property names used by the tokenizer
 */
let currentEsqlPropertyNames: string[] = DEFAULT_ESQL_PROPERTY_NAMES;
let currentEsqlPropertyPattern: RegExp = createEsqlPropertyPattern(DEFAULT_ESQL_PROPERTY_NAMES);

/**
 * Create a regex pattern to match any of the ES|QL property names for tokenization
 */
function createEsqlPropertyPattern(propertyNames: string[]): RegExp {
  const escapedNames = propertyNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^(\\s*)(${escapedNames.join('|')})(:)\\s*(.*)$`);
}

/**
 * Update the ES|QL property names used by the tokenizer.
 * Call this when the editor's esqlPropertyNames prop changes.
 */
export const setEsqlPropertyNames = (propertyNames: string[]): void => {
  if (
    propertyNames.length === currentEsqlPropertyNames.length &&
    propertyNames.every((name, i) => name === currentEsqlPropertyNames[i])
  ) {
    return; // No change
  }
  currentEsqlPropertyNames = propertyNames;
  currentEsqlPropertyPattern = createEsqlPropertyPattern(propertyNames);
};

/**
 * State class for the custom YAML+ES|QL tokenizer
 */
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

/**
 * Normalize ES|QL token type by extracting the base type
 */
const normalizeEsqlTokenType = (tokenType: string) => {
  const [base] = tokenType.split('.');
  return base || tokenType;
};

/**
 * Convert Monaco tokens to the format expected by the tokenizer
 */
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

/**
 * Tokenize a line as YAML
 */
const tokenizeYamlLine = (line: string) => {
  const yamlTokens = monaco.editor.tokenize(line, YAML_LANG_ID)[0];
  return toMonacoTokens(yamlTokens);
};

/**
 * Tokenize a line as ES|QL
 */
const tokenizeEsqlLine = (line: string, offset: number) => {
  const esqlTokens = monaco.editor.tokenize(line, ESQL_LANG_ID)[0];
  return toMonacoTokens(esqlTokens, normalizeEsqlTokenType).map((token) => ({
    startIndex: token.startIndex + offset,
    scopes: token.scopes,
  }));
};

/**
 * Tokenize a line in pending state (waiting for block content)
 */
function tokenizePendingState(
  line: string,
  state: AlertingYamlState,
  indent: number,
  trimmed: string
): { tokens: monaco.languages.IToken[]; endState: AlertingYamlState } {
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

/**
 * Tokenize a line in block state (inside block scalar)
 */
function tokenizeBlockState(
  line: string,
  state: AlertingYamlState,
  indent: number,
  trimmed: string
): { tokens: monaco.languages.IToken[]; endState: AlertingYamlState } {
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

/**
 * Tokenize a line in inline state (continuation of inline value)
 */
function tokenizeInlineState(
  line: string,
  state: AlertingYamlState,
  indent: number,
  trimmed: string
): { tokens: monaco.languages.IToken[]; endState: AlertingYamlState } {
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

/**
 * Tokenize an ES|QL property line with the key, colon, and value
 */
function tokenizeEsqlPropertyLine(
  line: string,
  queryMatch: RegExpExecArray
): { tokens: monaco.languages.IToken[]; endState: AlertingYamlState } {
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
    const queryText = rawValue.slice(quote ? 1 : 0, closingIndex > 0 ? closingIndex : undefined);
    const queryOffset = rawValueOffset + (quote ? 1 : 0);
    const tokens = [...baseTokens, ...tokenizeEsqlLine(queryText, queryOffset)];
    return { tokens, endState: new AlertingYamlState('inline', baseIndent, 0) };
  }

  return { tokens: baseTokens, endState: new AlertingYamlState('pending', baseIndent, 0) };
}

/**
 * Create the tokens provider for the custom YAML+ES|QL language
 */
const createTokensProvider = (): monaco.languages.TokensProvider => ({
  getInitialState: () => new AlertingYamlState('none', 0, 0),
  tokenize: (line, state) => {
    if (!(state instanceof AlertingYamlState)) {
      return { tokens: tokenizeYamlLine(line), endState: new AlertingYamlState('none', 0, 0) };
    }

    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const trimmed = line.trim();

    if (state.kind === 'pending') {
      return tokenizePendingState(line, state, indent, trimmed);
    }

    if (state.kind === 'block') {
      return tokenizeBlockState(line, state, indent, trimmed);
    }

    if (state.kind === 'inline') {
      return tokenizeInlineState(line, state, indent, trimmed);
    }

    const queryMatch = currentEsqlPropertyPattern.exec(line);
    if (!queryMatch) {
      return { tokens: tokenizeYamlLine(line), endState: state };
    }

    return tokenizeEsqlPropertyLine(line, queryMatch);
  },
});

/**
 * Ensure the custom YAML+ES|QL language is registered with Monaco
 */
export const ensureAlertingYamlLanguage = () => {
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

  monaco.languages.setTokensProvider(ALERTING_V2_YAML_ESQL_LANG_ID, createTokensProvider());
};

// Initialize language on module load
ensureAlertingYamlLanguage();
