/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function savedObjectsManagementApp({ loadTestFile }: FtrProviderContext) {
  describe('saved objects management', function savedObjectsManagementAppTestSuite() {
    this.tags('ciGroup7');
    loadTestFile(require.resolve('./edit_saved_object'));
  });
}
