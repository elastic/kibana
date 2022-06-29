/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  describe('response stream', function () {
    loadTestFile(require.resolve('./reducer_stream'));
  });
}
