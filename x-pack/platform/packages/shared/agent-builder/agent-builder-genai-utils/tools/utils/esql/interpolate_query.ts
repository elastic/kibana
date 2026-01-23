/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolParamValue } from '@kbn/agent-builder-common';
import { esql, WrappingPrettyPrinter, type WrappingPrettyPrinterOptions } from '@kbn/esql-language';
import { pickBy } from 'lodash';
import { inlineArrayParams } from './inline_array_params';

const defaultPrintOpts: WrappingPrettyPrinterOptions = {
  wrap: 80,
  pipeTab: '',
};

/**
 * Interpolates parameters into a templated ESQL query string.
 *
 * @param template The ESQL query template with '?' placeholders (e.g., "?user_id").
 * @param params An object where keys match the placeholder names and values are the data to insert.
 * @param printOpts (optional) Options for the pretty printer.
 * @returns The interpolated ESQL query string.
 *
 * **Important** This is meant as a workaround until a proper util gets exposed from `@kbn/esql-language`,
 *               and likely doesn't cover all edge cases.
 * **Important** This is meant as a workaround until https://github.com/elastic/elasticsearch-specification/issues/5083 is fixed.
 */
export const interpolateEsqlQuery = (
  template: string,
  params: Record<string, EsqlToolParamValue | null>,
  printOpts: WrappingPrettyPrinterOptions = defaultPrintOpts
): string => {
  const query = esql(template, params);
  const allParams = query.getParams();

  const arrayParams = pickBy(allParams, isArrayParam);
  inlineArrayParams(query.ast, arrayParams);

  const nonArrayParams = pickBy(allParams, (value) => !isArrayParam(value));
  Object.keys(nonArrayParams).forEach((paramName: string) => query.inlineParam(paramName));

  return WrappingPrettyPrinter.print(query.ast, printOpts);
};

// Type guard for array parameter values
const isArrayParam = (value: unknown): value is string[] | number[] => {
  return Array.isArray(value);
};
