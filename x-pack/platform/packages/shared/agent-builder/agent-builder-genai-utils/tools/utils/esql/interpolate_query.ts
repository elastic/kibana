/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, WrappingPrettyPrinter, type WrappingPrettyPrinterOptions } from '@kbn/esql-ast';

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
 * **Important** This is meant as a workaround until a proper util gets exposed from `@kbn/esql-ast`,
 *               and likely doesn't cover all edge cases.
 */
export const interpolateEsqlQuery = (
  template: string,
  params: Record<string, unknown>,
  printOpts: WrappingPrettyPrinterOptions = defaultPrintOpts
): string => {
  const query = esql(template, params);
  query.inlineParams();
  return WrappingPrettyPrinter.print(query.ast, printOpts);
};
