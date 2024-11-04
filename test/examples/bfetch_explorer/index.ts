/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'header']);

  describe('bfetch explorer', function () {
    before(async () => {
      await browser.setWindowSize(1300, 900);
      await PageObjects.common.navigateToApp('bfetch-explorer', { insertTimestamp: false });
    });

    loadTestFile(require.resolve('./batched_function'));
  });
}
