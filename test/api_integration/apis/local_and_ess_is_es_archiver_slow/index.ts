/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Es Archiver Load Action Performance on Local and ESS', function () {
    loadTestFile(require.resolve('./local_and_ess_big_loop'));
  });
}
