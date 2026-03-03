/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../common/ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('X-Pack Accessibility Tests - Group 4', function () {
    loadTestFile(require.resolve('../group1/advanced_settings'));
    loadTestFile(require.resolve('../group1/dashboard_controls'));
    loadTestFile(require.resolve('../group1/dashboard_links'));
    loadTestFile(require.resolve('../group1/dashboard_panel_options'));
    loadTestFile(require.resolve('../group1/users'));
    loadTestFile(require.resolve('../group1/roles'));
    loadTestFile(require.resolve('../group1/ingest_node_pipelines'));
    loadTestFile(require.resolve('../group1/index_lifecycle_management'));
  });
};
