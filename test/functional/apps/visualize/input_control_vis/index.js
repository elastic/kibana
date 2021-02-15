/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ loadTestFile }) {
  describe('input controls', function () {
    loadTestFile(require.resolve('./input_control_options'));
    loadTestFile(require.resolve('./dynamic_options'));
    loadTestFile(require.resolve('./chained_controls'));
    loadTestFile(require.resolve('./input_control_range'));
  });
}
