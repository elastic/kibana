/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function apiIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('guided onboarding', () => {
    loadTestFile(require.resolve('./get_state'));
    loadTestFile(require.resolve('./put_state'));
    loadTestFile(require.resolve('./get_guides'));
    loadTestFile(require.resolve('./get_config'));
    loadTestFile(require.resolve('./activate_guide'));
  });
}
