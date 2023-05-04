/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ loadTestFile }) {
  describe('index_patterns', () => {
    loadTestFile(require.resolve('./es_errors'));
    loadTestFile(require.resolve('./fields_for_wildcard_route'));
    loadTestFile(require.resolve('./data_views_crud'));
    loadTestFile(require.resolve('./scripted_fields_crud'));
    loadTestFile(require.resolve('./fields_api'));
    loadTestFile(require.resolve('./default_index_pattern'));
    loadTestFile(require.resolve('./runtime_fields_crud'));
    loadTestFile(require.resolve('./integration'));
    loadTestFile(require.resolve('./deprecations'));
    loadTestFile(require.resolve('./has_user_index_pattern'));
  });
}
