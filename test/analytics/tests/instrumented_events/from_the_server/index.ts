/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../services';

export default function ({ getService }: FtrProviderContext) {
  describe('from the server', () => {
    beforeEach(async () => {
      await getService('kibana_ebt_server').setOptIn(true);
    });

    // Add tests for UI-instrumented events here:
    // loadTestFile(require.resolve('./some_event'));
  });
}
