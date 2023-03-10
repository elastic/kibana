/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: PluginFunctionalProviderContext) {
  describe('content management examples', function () {
    loadTestFile(require.resolve('./todo_app'));
  });
}
