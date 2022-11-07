/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ loadTestFile }) {
  describe('index_patterns/_fields_for_wildcard route', () => {
    loadTestFile(require.resolve('./params'));
    loadTestFile(require.resolve('./conflicts'));
    loadTestFile(require.resolve('./response'));
    loadTestFile(require.resolve('./filter'));
  });
}
