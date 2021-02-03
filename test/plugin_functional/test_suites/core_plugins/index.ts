/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../services';

export default function ({ loadTestFile }: PluginFunctionalProviderContext) {
  describe('core plugins', () => {
    loadTestFile(require.resolve('./applications'));
    loadTestFile(require.resolve('./elasticsearch_client'));
    loadTestFile(require.resolve('./server_plugins'));
    loadTestFile(require.resolve('./ui_plugins'));
    loadTestFile(require.resolve('./ui_settings'));
    loadTestFile(require.resolve('./top_nav'));
    loadTestFile(require.resolve('./application_leave_confirm'));
    loadTestFile(require.resolve('./application_status'));
    loadTestFile(require.resolve('./rendering'));
    loadTestFile(require.resolve('./chrome_help_menu_links'));
  });
}
