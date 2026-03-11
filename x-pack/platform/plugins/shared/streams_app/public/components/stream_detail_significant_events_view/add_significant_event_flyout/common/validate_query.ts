/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQuery } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { Parser } from '@elastic/esql';

export interface FieldValidation {
  isInvalid: boolean;
  error?: string;
}

const REQUIRED_MESSAGE = i18n.translate(
  'xpack.streams.significantEventFlyout.formFieldRequiredError',
  { defaultMessage: 'Required' }
);

const INVALID_SYNTAX_MESSAGE = i18n.translate(
  'xpack.streams.significantEventFlyout.formFieldQuerySyntaxError',
  { defaultMessage: 'Invalid syntax' }
);

export function validateTitle(title: string): FieldValidation {
  const isEmpty = title.length === 0;
  return {
    isInvalid: isEmpty,
    error: isEmpty ? REQUIRED_MESSAGE : undefined,
  };
}

export function validateEsqlQuery(esqlQuery: string): FieldValidation {
  if (!esqlQuery.trim()) {
    return { isInvalid: true, error: REQUIRED_MESSAGE };
  }

  let hasSyntaxError = false;
  try {
    const { errors } = Parser.parse(esqlQuery);
    hasSyntaxError = errors.length > 0;
  } catch {
    hasSyntaxError = true;
  }

  return {
    isInvalid: hasSyntaxError,
    error: hasSyntaxError ? INVALID_SYNTAX_MESSAGE : undefined,
  };
}

export function validateQuery(query: Pick<StreamQuery, 'title' | 'esql'>): {
  title: FieldValidation;
  esql: FieldValidation;
} {
  return {
    title: validateTitle(query.title ?? ''),
    esql: validateEsqlQuery(query.esql?.query ?? ''),
  };
}
