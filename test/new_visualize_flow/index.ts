/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('New Visualize Flow', function () {
    this.tags('ciGroup2');
    const esArchiver = getService('esArchiver');
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    loadTestFile(require.resolve('./dashboard_embedding'));
  });
}
