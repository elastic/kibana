/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ALERTS_ESQL_QUERY_LIMIT } from '../common';
import { buildEsqlSearchRequest } from './build_esql_search_request';

describe('buildEsqlSearchRequest', () => {
  it('requests one extra row so the executor can detect truncation', () => {
    const request = buildEsqlSearchRequest({
      query: 'FROM logs-*',
      timestampField: '@timestamp',
      from: 'now-10m',
      to: 'now',
      previousOriginalDocumentIds: [],
    });

    expect(request.query).toBe(`FROM logs-* | LIMIT ${MAX_ALERTS_ESQL_QUERY_LIMIT}`);
  });
});
