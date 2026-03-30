/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { lastValueFrom, map } from 'rxjs';

export interface ExecuteEsqlQueryOptions<Input> {
  expressions: ExpressionsStart;
  query: string;
  abortSignal?: AbortSignal;
  input: Input;
}

/**
 * Executes an ES|QL query through the expressions plugin, using Discover's `esql` function,
 * which also transforms the tabular result into a datatable-ready data structure.
 */
export const executeEsqlQuery = <Input = unknown>({
  expressions,
  query,
  input,
  abortSignal,
}: ExecuteEsqlQueryOptions<Input>) => {
  const executionContract = expressions.execute<Input, Datatable>(`esql '${query}'`, input);
  abortSignal?.addEventListener('abort', (e) => {
    executionContract.cancel((e.target as AbortSignal)?.reason);
  });
  return lastValueFrom(
    executionContract.getData().pipe(
      map(({ result }) => {
        if (result.type === 'error') {
          throw result.error;
        }
        return result;
      })
    )
  );
};
