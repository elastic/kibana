/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function ({ loadTestFile }) {
  describe('apis', () => {
    loadTestFile(require.resolve('./core'));
    loadTestFile(require.resolve('./general'));
    loadTestFile(require.resolve('./home'));
    loadTestFile(require.resolve('./index_patterns'));
    loadTestFile(require.resolve('./kql_telemetry'));
    loadTestFile(require.resolve('./saved_objects_management'));
    loadTestFile(require.resolve('./saved_objects'));
    loadTestFile(require.resolve('./scripts'));
    loadTestFile(require.resolve('./search'));
    loadTestFile(require.resolve('./shorten'));
    loadTestFile(require.resolve('./suggestions'));
    loadTestFile(require.resolve('./status'));
    loadTestFile(require.resolve('./stats'));
    loadTestFile(require.resolve('./ui_metric'));
    loadTestFile(require.resolve('./ui_counters'));
    loadTestFile(require.resolve('./telemetry'));
  });
}
