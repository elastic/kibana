/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { appDocumentSchema, findNode } from '@kbn/custom-app-common';
import { createDefaultDocument, SERVICE_DETAIL_QUERY, SERVICES_QUERY } from './default_document';

describe('createDefaultDocument', () => {
  it('lets the picker choose the accent, and only with accents the picker offers', () => {
    const { theme, state, root } = createDefaultDocument();
    const picker = (
      findNode(root, 'look-picker')?.node as { options: Array<{ value: string }> }
    ).options.map(({ value }) => value);

    expect(theme?.accent).toEqual({ $state: 'look' });
    expect(state.look).toEqual({ type: 'string', default: 'teal' });
    expect(picker).toEqual(['teal', 'purple', 'orange', 'blue']);
  });

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
