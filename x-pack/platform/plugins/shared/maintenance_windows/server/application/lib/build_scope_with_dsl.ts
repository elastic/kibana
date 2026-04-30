/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase, Filter, EsQueryConfig } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { ScopedQueryAttributes } from '../../../common';

export const buildScopeWithDsl = (
  scopeField: ScopedQueryAttributes,
  indexPattern: DataViewBase,
  esQueryConfig: EsQueryConfig
): ScopedQueryAttributes => ({
  ...scopeField,
  dsl: JSON.stringify(
    buildEsQuery(
      indexPattern,
      [{ query: scopeField.kql, language: 'kuery' }],
      scopeField.filters as Filter[],
      esQueryConfig
    )
  ),
});
