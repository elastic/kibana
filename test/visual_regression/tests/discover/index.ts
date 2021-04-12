/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DEFAULT_OPTIONS } from '../../services/visual_testing/visual_testing';
import { FtrProviderContext } from '../../ftr_provider_context';

// Width must be the same as visual_testing or canvas image widths will get skewed
const [SCREEN_WIDTH] = DEFAULT_OPTIONS.widths || [];

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');

  describe('discover app', function () {
    this.tags('ciGroup6');

    before(function () {
      return browser.setWindowSize(SCREEN_WIDTH, 1000);
    });

    loadTestFile(require.resolve('./chart_visualization'));
  });
}
