/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { appDocumentSchema } from '@kbn/custom-app-common';
import { createDefaultDocument, SERVICE_DETAIL_QUERY, SERVICES_QUERY } from './default_document';

describe('createDefaultDocument', () => {
  it('is a valid document', () => {
    expect(appDocumentSchema.safeParse(createDefaultDocument()).success).toBe(true);
  });

  it.each([
    ['services', SERVICES_QUERY],
    ['detail', SERVICE_DETAIL_QUERY],
  ])('has a syntactically valid %s query', (_name, query) => {
    expect(Parser.parse(query).errors).toEqual([]);
  });

  it('parameterises the queries with state keys the document declares', () => {
    expect(getESQLQueryVariables(SERVICES_QUERY).sort()).toEqual(['minErrors', 'nameFilter']);
    expect(getESQLQueryVariables(SERVICE_DETAIL_QUERY)).toEqual(['service']);

    const declared = Object.keys(createDefaultDocument().state);
    expect(declared).toEqual(expect.arrayContaining(['minErrors', 'nameFilter', 'service']));
  });
});
