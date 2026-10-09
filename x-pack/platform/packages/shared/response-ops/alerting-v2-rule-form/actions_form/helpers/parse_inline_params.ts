/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { YAMLError } from 'yaml';
import { isMap, LineCounter, parseDocument } from 'yaml';
import type { InlineActionParamError } from '../types';

type ParseInlineParamsResult =
  | { readonly params: Readonly<Record<string, unknown>> }
  | { readonly error: InlineActionParamError };

const invalidYaml = (reason: string): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.invalidYaml', {
    defaultMessage: 'Invalid YAML: {reason}',
    values: { reason },
  });

const invalidYamlAt = (reason: string, line: number, column: number): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.invalidYamlAt', {
    defaultMessage: 'Invalid YAML on line {line}, column {column}: {reason}',
    values: { reason, line, column },
  });

const paramsNotAMap = (): string =>
  i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.validation.paramsNotAMap', {
    defaultMessage: 'Parameters must be a YAML map of field names to values.',
  });

const toSyntaxError = (
  { message, pos: [start] }: YAMLError,
  lineCounter: LineCounter
): InlineActionParamError => {
  if (start < 0) {
    return { message: invalidYaml(message) };
  }
  const { line, col } = lineCounter.linePos(start);
  return { message: invalidYamlAt(message, line, col) };
};

/** Parses inline action params YAML into the step params map, or the reason it can't be used. */
export const parseInlineParams = (yaml: string): ParseInlineParamsResult => {
  const lineCounter = new LineCounter();
  // `logLevel: 'error'` keeps the parser from warning about map keys on every
  // keystroke of an unquoted `{{ ... }}` expression.
  const doc = parseDocument(yaml, { lineCounter, logLevel: 'error', prettyErrors: false });
  const [syntaxError] = doc.errors;
  if (syntaxError) {
    return { error: toSyntaxError(syntaxError, lineCounter) };
  }
  if (doc.contents !== null && !isMap(doc.contents)) {
    return { error: { message: paramsNotAMap() } };
  }

  try {
    return { params: doc.toJS() ?? {} };
  } catch (err) {
    // e.g. excessive alias expansion
    return { error: { message: invalidYaml(err instanceof Error ? err.message : String(err)) } };
  }
};
