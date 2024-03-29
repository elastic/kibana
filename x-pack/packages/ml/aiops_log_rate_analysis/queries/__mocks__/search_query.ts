/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This is the format that gets passed on from the Kibana search bar.
export const searchQueryMock = JSON.stringify({
  bool: {
    filter: [],
    minimum_should_match: 1,
    must_not: [],
    should: [{ term: { 'the-term': { value: 'the-value' } } }],
  },
});
