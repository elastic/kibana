/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('apis', () => {
    loadTestFile(require.resolve('./console'));
    loadTestFile(require.resolve('./core'));
    loadTestFile(require.resolve('./custom_integration'));
    loadTestFile(require.resolve('./general'));
    loadTestFile(require.resolve('./home'));
    loadTestFile(require.resolve('./data_view_field_editor'));
    loadTestFile(require.resolve('./index_patterns'));
    loadTestFile(require.resolve('./kql_telemetry'));
    loadTestFile(require.resolve('./saved_objects_management'));
    loadTestFile(require.resolve('./saved_objects'));
    loadTestFile(require.resolve('./scripts'));
    loadTestFile(require.resolve('./search'));
    loadTestFile(require.resolve('./short_url'));
    loadTestFile(require.resolve('./suggestions'));
    loadTestFile(require.resolve('./status'));
    loadTestFile(require.resolve('./stats'));
    loadTestFile(require.resolve('./ui_metric'));
    loadTestFile(require.resolve('./ui_counters'));
    loadTestFile(require.resolve('./telemetry'));
  });
}
