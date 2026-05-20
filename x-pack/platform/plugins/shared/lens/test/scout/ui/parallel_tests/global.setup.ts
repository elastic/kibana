/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { testData } from '../fixtures';

globalSetupHook('Setup environment for Lens tests', async ({ esArchiver, esClient }) => {
  await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);

  // Add runtime_string field to logstash indices for fields_list tests.
  // runtime_number already exists in the archive mappings.
  await esClient.indices.putMapping({
    index: 'logstash-*',
    runtime: {
      runtime_string: {
        type: 'keyword',
        script: { source: "emit('abc')" },
      },
    },
  });
});
