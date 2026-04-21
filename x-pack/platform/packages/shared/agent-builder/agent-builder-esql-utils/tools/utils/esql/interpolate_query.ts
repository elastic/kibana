/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolParamValue } from '@kbn/agent-builder-common';
import { esql, WrappingPrettyPrinter, type WrappingPrettyPrinterOptions } from '@elastic/esql';

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
  // Filter out null params — they represent optional parameters that weren't provided.
  // inlineParams() cannot handle null values and would throw "cannot inline parameter".
  const nonNullParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== null)
  );
  const query = esql(template, nonNullParams);
  query.inlineParams();
  return WrappingPrettyPrinter.print(query.ast, printOpts);
};
