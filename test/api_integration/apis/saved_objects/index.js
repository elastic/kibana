/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function ({ loadTestFile }) {
  describe('saved_objects', () => {
    loadTestFile(require.resolve('./bulk_create'));
    loadTestFile(require.resolve('./bulk_get'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./export'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./import'));
    loadTestFile(require.resolve('./resolve_import_errors'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./bulk_update'));
    loadTestFile(require.resolve('./migrations'));
  });
}
