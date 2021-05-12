/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../services';

export default function ({ loadTestFile }: PluginFunctionalProviderContext) {
  describe('Saved Objects Management', function () {
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./scroll_count'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./export_transform'));
    loadTestFile(require.resolve('./import_warnings'));
    loadTestFile(require.resolve('./hidden_types'));
  });
}
