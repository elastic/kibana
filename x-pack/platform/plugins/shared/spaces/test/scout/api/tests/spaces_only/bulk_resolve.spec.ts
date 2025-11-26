/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, apiTest, tags } from '@kbn/scout';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

apiTest.describe('_bulk_resolve', { tag: tags.ESS_ONLY }, () => {
  apiTest.beforeAll(async ({ kbnClient, apiClient }) => {
    // TODO: Implement test setup
    // 1. Create FTR spaces (default, space_1, space_2)
    // 2. Load saved objects data for default space from kbn_archiver fixture
    // 3. Load saved objects data for space_1 from kbn_archiver fixture
    // 4. Load saved objects data for space_2 from kbn_archiver fixture
    // 5. Load ES archiver data for resolve test cases (includes alias fixtures)
  });

  apiTest.afterAll(async ({ kbnClient, esClient }) => {
    // TODO: Implement cleanup
    // 1. Unload ES archiver data
    // 2. Delete all saved objects from Kibana index
    // 3. Delete FTR spaces
  });

  apiTest.describe('within the default space', () => {
    apiTest('should return 200', async ({ apiClient }) => {
      // TODO: Implement test for POST /api/saved_objects/_bulk_resolve in default space
      // 1. Create test cases array with objects to resolve:
      //    - EXACT_MATCH (should return exactMatch outcome)
      //    - ALIAS_MATCH (should return aliasMatch outcome with alias targetId)
      //    - CONFLICT (should return conflict outcome with multiple matches)
      //    - DISABLED (should fail 404 - alias is disabled)
      //    - HIDDEN (should fail 400 - hidden type)
      //    - DOES_NOT_EXIST (should fail 404)
      // 2. Prepare request body as array of {type, id}
      // 3. Send POST request to /s/default/api/saved_objects/_bulk_resolve
      // 4. Verify response status is 200
      // 5. Verify resolved_objects array length matches request
      // 6. For each resolved object verify:
      //    - Successful resolves have saved_object with correct type, id, attributes
      //    - Outcome is 'exactMatch', 'aliasMatch', or 'conflict' as appropriate
      //    - aliasMatch cases include alias_target_id and alias_purpose
      //    - conflict cases include alias_target_id
      //    - Failed resolves have error with correct statusCode and message
    });
  });

  apiTest.describe('within space_1', () => {
    apiTest('should return 200', async ({ apiClient }) => {
      // TODO: Implement test for POST /api/saved_objects/_bulk_resolve in space_1
      // 1. Create test cases array adjusted for space_1 context
      // 2. Verify EXACT_MATCH works in space_1
      // 3. Verify ALIAS_MATCH works (alias exists in space_1)
      // 4. Verify CONFLICT outcome adjusted for space_1
      // 5. Verify DISABLED and DOES_NOT_EXIST fail appropriately
      // 6. Send POST request to /s/space_1/api/saved_objects/_bulk_resolve
      // 7. Verify response matches expected outcomes for space_1
    });
  });

  apiTest.describe('within space_2', () => {
    apiTest('should return 200', async ({ apiClient }) => {
      // TODO: Implement test for POST /api/saved_objects/_bulk_resolve in space_2
      // 1. Create test cases array adjusted for space_2 context
      // 2. Verify EXACT_MATCH works in space_2
      // 3. Verify ALIAS_MATCH fails 404 (alias does not exist in space_2)
      // 4. Verify CONFLICT becomes EXACT_MATCH in space_2 (no alias conflict)
      // 5. Verify DISABLED and DOES_NOT_EXIST fail appropriately
      // 6. Send POST request to /s/space_2/api/saved_objects/_bulk_resolve
      // 7. Verify response matches expected outcomes for space_2
    });
  });
});
