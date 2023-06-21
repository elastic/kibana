/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../services';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('from the browser', () => {
    // Add tests for UI-instrumented events here:
    loadTestFile(require.resolve('./click'));
    loadTestFile(require.resolve('./loaded_kibana'));
    loadTestFile(require.resolve('./loaded_dashboard'));
    loadTestFile(require.resolve('./core_context_providers'));
    loadTestFile(require.resolve('./viewport_resize'));
  });
}
