/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/platform/test/api_integration/apis/ml/management/index.ts
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('management', function () {
    loadTestFile(require.resolve('./get_list'));
  });
}
========
import { createPlaywrightConfig } from '@kbn/scout';

export default createPlaywrightConfig({
  testDir: './tests',
});
>>>>>>>> b99d043eaa2b ([scout] migrate Lens API tests (#267993)):x-pack/platform/plugins/shared/lens/test/scout/api/playwright.config.ts
