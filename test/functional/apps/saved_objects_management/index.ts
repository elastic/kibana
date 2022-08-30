/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function savedObjectsManagementApp({ loadTestFile }: FtrProviderContext) {
  describe('saved objects management', function savedObjectsManagementAppTestSuite() {
    loadTestFile(require.resolve('./inspect_saved_objects'));
    loadTestFile(require.resolve('./show_relationships'));
  });
}
