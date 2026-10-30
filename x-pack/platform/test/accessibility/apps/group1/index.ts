/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../common/ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('X-Pack Accessibility Tests - Group 1', function () {
    loadTestFile(require.resolve('./login_page'));
    loadTestFile(require.resolve('./dashboard_controls'));
    loadTestFile(require.resolve('./dashboard_links'));
    loadTestFile(require.resolve('./dashboard_panel_options'));
    loadTestFile(require.resolve('./users'));
    loadTestFile(require.resolve('./roles'));
  });
};
