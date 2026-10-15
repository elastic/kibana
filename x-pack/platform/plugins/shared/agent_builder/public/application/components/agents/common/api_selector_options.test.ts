/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@elastic/schemas/es/tools/manifest.js', () => ({
  esManifest: [
    { id: 'indices.create', description: 'Create an index.', destructive: false },
    { id: 'indices.delete', description: 'Delete indices.', destructive: true },
    { id: 'async-search.delete', description: 'Delete an async search.', destructive: true },
    { id: 'cat.indices', description: 'Get index information.', destructive: false },
    { id: 'bulk', description: 'Bulk index or delete documents.', destructive: true },
    { id: 'search', description: 'Run a search.', destructive: false },
  ],
}));

jest.mock('@elastic/schemas/kibana/tools/manifest.js', () => ({
  kibanaManifest: [
    { id: 'cases.create', description: 'Create a case', destructive: false },
    { id: 'cases.delete', description: 'Delete cases', destructive: true },
  ],
}));

import { destructiveApiSelectorOptionsByTarget } from './api_selector_options';

describe('destructiveApiSelectorOptionsByTarget', () => {
  it('keeps only the destructive operations and the namespaces that hold them', () => {
    expect(
      destructiveApiSelectorOptionsByTarget.elasticsearch.map(({ selector }) => selector)
    ).toEqual([
      '*',
      'async-search.*',
      'indices.*',
      'indices.delete',
      'async-search.delete',
      'bulk',
    ]);
  });

  it('counts the destructive operations each wildcard covers', () => {
    expect(destructiveApiSelectorOptionsByTarget.elasticsearch.slice(0, 3)).toEqual([
      { kind: 'all', selector: '*', apiCount: 3 },
      { kind: 'namespace', selector: 'async-search.*', namespace: 'async-search', apiCount: 1 },
      { kind: 'namespace', selector: 'indices.*', namespace: 'indices', apiCount: 1 },
    ]);
  });

  it('describes each operation with its manifest summary', () => {
    expect(destructiveApiSelectorOptionsByTarget.kibana).toEqual([
      { kind: 'all', selector: '*', apiCount: 1 },
      { kind: 'namespace', selector: 'cases.*', namespace: 'cases', apiCount: 1 },
      { kind: 'api', selector: 'cases.delete', description: 'Delete cases' },
    ]);
  });
});
