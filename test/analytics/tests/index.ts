/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../services';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('analytics', () => {
    // These tests need to run before the other tests because they require the initial `unknown` opt-in state
    describe('analytics service', () => {
      loadTestFile(require.resolve('./analytics_from_the_browser'));
      loadTestFile(require.resolve('./analytics_from_the_server'));
    });

    describe('instrumented events', () => {
      loadTestFile(require.resolve('./instrumented_events/from_the_browser'));
      loadTestFile(require.resolve('./instrumented_events/from_the_server'));
    });
  });
}
