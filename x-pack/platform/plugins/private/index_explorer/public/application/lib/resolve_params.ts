/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findEsqlParamNames } from '../../../common/esql_params';
import type { CannedQueryParam, EsqlParam, EsqlParamType } from '../../../common/types';

/** Builds parameters for every placeholder in the query from declared defaults and URL values. */
export function resolveParams(
  query: string,
  declaredParams: readonly CannedQueryParam[],
  values: Record<string, string>,
  types: Record<string, EsqlParamType>
): EsqlParam[] {
  const names = [
    ...declaredParams.map(({ name }) => name),
    ...findEsqlParamNames(query).filter(
      (name) => !declaredParams.some((param) => param.name === name)
    ),
  ];
  return names.map((name) => {
    const declared = declaredParams.find((param) => param.name === name);
    return {
      name,
      type: declared?.type ?? types[name] ?? 'string',
      value: values[name] ?? declared?.defaultValue ?? '',
    };
  });
}
