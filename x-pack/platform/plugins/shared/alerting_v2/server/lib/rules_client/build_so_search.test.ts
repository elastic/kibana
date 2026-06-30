/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SEARCH_FIELDS } from './build_so_search';

describe('RULE_SEARCH_FIELDS', () => {
  it('contains only text-mapped fields', () => {
    expect(RULE_SEARCH_FIELDS).toEqual(['metadata.name', 'metadata.description']);
  });
});
