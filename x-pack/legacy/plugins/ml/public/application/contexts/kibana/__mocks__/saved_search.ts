/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const savedSearchMock: any = {
  id: 'the-saved-search-id',
  type: 'search',
  attributes: {
    title: 'the-saved-search-title',
    kibanaSavedObjectMeta: {
      searchSourceJSON:
        '{"highlightAll":true,"version":true,"query":{"query":"foo : \\"bar\\" ","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
    },
  },
  references: [
    {
      name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      type: 'index-pattern',
      id: 'the-index-pattern-id',
    },
  ],
  migrationVersion: { search: '7.5.0' },
  error: undefined,
};
