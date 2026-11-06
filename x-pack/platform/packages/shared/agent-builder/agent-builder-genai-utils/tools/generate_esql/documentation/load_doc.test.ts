/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promqlFunctionDefinitions } from '@elastic/esql-definitions/promql-functions';
import { _loadDocumentation, EsqlDocEntry, PROMQL_FUNCTIONS_PLACEHOLDER } from './load_doc';

describe('loadDocumentation', () => {
  it('lists every supported PromQL function in the PromQL documentation', async () => {
    const promqlDoc = (await _loadDocumentation()).getDocContent(EsqlDocEntry.promqlQueries);

    expect(promqlDoc).not.toContain(PROMQL_FUNCTIONS_PLACEHOLDER);
    expect(promqlFunctionDefinitions.length).toBeGreaterThan(0);
    promqlFunctionDefinitions.forEach(({ name }) => {
      expect(promqlDoc).toContain(`\`${name}\``);
    });
  });

  it('removes maintainer comments from the documentation', async () => {
    const promqlDoc = (await _loadDocumentation()).getDocContent(EsqlDocEntry.promqlQueries);

    expect(promqlDoc).not.toContain('<!--');
    expect(promqlDoc).not.toContain('-->');
  });
});
