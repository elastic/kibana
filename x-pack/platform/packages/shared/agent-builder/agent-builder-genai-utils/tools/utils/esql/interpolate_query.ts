/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolParamValue } from '@kbn/agent-builder-common';
import { esql, WrappingPrettyPrinter, type WrappingPrettyPrinterOptions } from '@kbn/esql-language';

const defaultPrintOpts: WrappingPrettyPrinterOptions = {
  wrap: 80,
  pipeTab: '',
};

/**
 * Interpolates parameters into a templated ESQL query string.
 */
export const interpolateEsqlQuery = (
  template: string,
  params: Record<string, EsqlToolParamValue | null>,
  printOpts: WrappingPrettyPrinterOptions = defaultPrintOpts
): string => {
  const query = esql(template, params);
  query.inlineParams();
  return WrappingPrettyPrinter.print(query.ast, printOpts);
};
