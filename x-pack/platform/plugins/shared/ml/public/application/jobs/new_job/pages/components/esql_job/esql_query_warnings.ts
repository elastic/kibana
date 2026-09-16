/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EsqlQueryWarningClause = 'where' | 'sort' | 'limit';

export interface EsqlQueryWarningOptions {
  query: string;
  sourceTimeField: string;
  emittedTimeField: string;
  fallbackTimeField: string;
}

const normalizeIdentifier = (identifier: string) =>
  identifier.replace(/^`|`$/g, '').replace(/``/g, '`').toLowerCase();

const skipQuotedText = (query: string, start: number, quote: string) => {
  let index = start + 1;

  while (index < query.length) {
    if (query[index] === '\\') {
      index += 2;
      continue;
    }
    if (query[index] !== quote) {
      index++;
      continue;
    }
    if (query[index + 1] === quote) {
      index += 2;
      continue;
    }
    return index + 1;
  }

  return query.length;
};

const withoutComments = (query: string) => {
  let result = '';
  let index = 0;

  while (index < query.length) {
    const character = query[index];
    if (character === "'" || character === '"' || character === '`') {
      const end = skipQuotedText(query, index, character);
      result += query.slice(index, end);
      index = end;
      continue;
    }
    if (query.slice(index, index + 2) === '//') {
      const lineEnd = query.indexOf('\n', index);
      const end = lineEnd === -1 ? query.length : lineEnd;
      result += query.slice(index, end).replace(/[^\n]/g, ' ');
      index = end;
      continue;
    }
    if (query.slice(index, index + 2) === '/*') {
      const commentEnd = query.indexOf('*/', index + 2);
      const end = commentEnd === -1 ? query.length : commentEnd + 2;
      result += query.slice(index, end).replace(/[^\n]/g, ' ');
      index = end;
      continue;
    }
    result += character;
    index++;
  }

  return result;
};

const splitTopLevelPipelines = (query: string) => {
  const pipelines: string[] = [];
  let clauseStart = 0;
  let nesting = 0;
  let index = 0;

  while (index < query.length) {
    const character = query[index];
    if (character === "'" || character === '"' || character === '`') {
      index = skipQuotedText(query, index, character);
      continue;
    }
    if ('([{'.includes(character)) nesting++;
    if (')]}'.includes(character) && nesting > 0) nesting--;
    if (character === '|' && nesting === 0) {
      pipelines.push(query.slice(clauseStart, index));
      clauseStart = index + 1;
    }
    index++;
  }

  pipelines.push(query.slice(clauseStart));
  return pipelines;
};

const clauseTokens = (clause: string) => {
  const tokens: string[] = [];
  let index = 0;

  while (index < clause.length) {
    const character = clause[index];
    if (/\s/.test(character) || ',()=<>!+*/-'.includes(character)) {
      index++;
      continue;
    }
    if (character === "'" || character === '"') {
      index = skipQuotedText(clause, index, character);
      continue;
    }
    if (character === '`') {
      const end = skipQuotedText(clause, index, character);
      tokens.push(clause.slice(index, end));
      index = end;
      continue;
    }
    const tokenStart = index;
    while (
      index < clause.length &&
      !/\s/.test(clause[index]) &&
      !',()=<>!+*/-'.includes(clause[index])
    ) {
      index++;
    }
    tokens.push(clause.slice(tokenStart, index));
  }

  return tokens;
};

const configuredTimeFields = ({
  sourceTimeField,
  emittedTimeField,
  fallbackTimeField,
}: EsqlQueryWarningOptions) =>
  new Set(
    [sourceTimeField, emittedTimeField || fallbackTimeField]
      .filter((field) => field !== '')
      .map(normalizeIdentifier)
  );

const hasDirectTimeField = (tokens: string[], timeFields: Set<string>) =>
  tokens.length > 1 && timeFields.has(normalizeIdentifier(tokens[1]));

const hasNumericLimit = (tokens: string[]) =>
  tokens.length > 1 && /^\d+(?:\.\d+)?$/.test(tokens[1]);

export const getEsqlQueryWarnings = (
  options: EsqlQueryWarningOptions
): EsqlQueryWarningClause[] => {
  if (options.query.trim() === '') return [];

  const timeFields = configuredTimeFields(options);
  const warnings: EsqlQueryWarningClause[] = [];

  splitTopLevelPipelines(withoutComments(options.query)).forEach((clause) => {
    const tokens = clauseTokens(clause);
    const command = tokens[0]?.toLowerCase();

    if (command === 'where' && hasDirectTimeField(tokens, timeFields)) warnings.push('where');
    if (command === 'sort' && hasDirectTimeField(tokens, timeFields)) warnings.push('sort');
    if (command === 'limit' && hasNumericLimit(tokens)) warnings.push('limit');
  });

  return warnings;
};
