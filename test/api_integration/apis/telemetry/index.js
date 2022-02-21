/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ loadTestFile }) {
  describe('Telemetry', () => {
    loadTestFile(require.resolve('./opt_in'));
    loadTestFile(require.resolve('./telemetry_last_reported'));
    loadTestFile(require.resolve('./telemetry_optin_notice_seen'));
  });
}
