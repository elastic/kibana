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

apiTest.describe('_resolve', { tag: tags.ESS_ONLY }, () => {
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
    apiTest('should return 200/400/404', async ({ apiClient }) => {
      // TODO: Implement test for GET /api/saved_objects/resolve/{type}/{id} in default space
      // 1. Create test cases for default space:
      //    - EXACT_MATCH (should return exactMatch outcome with saved_object)
      //    - ALIAS_MATCH (should return aliasMatch outcome with alias_target_id and alias_purpose)
      //    - CONFLICT (should return conflict outcome with multiple matches and alias_target_id)
      //    - DISABLED (should return 404 - alias is disabled)
      //    - HIDDEN (should return 400 - hidden type)
      //    - DOES_NOT_EXIST (should return 404)
      // 2. For each test case send GET request to /s/default/api/saved_objects/resolve/{type}/{id}
      // 3. Verify response status (200 for success, 400 for bad request, 404 for not found)
      // 4. For successful responses verify:
      //    - saved_object contains correct type, id, attributes
      //    - outcome is 'exactMatch', 'aliasMatch', or 'conflict'
      //    - For aliasMatch: alias_target_id and alias_purpose are present
      //    - For conflict: alias_target_id is present
      //    - namespaces array is correct
      // 5. For failed responses verify error message
    });
  });

  apiTest.describe('within space_1', () => {
    apiTest('should return 200/400/404', async ({ apiClient }) => {
      // TODO: Implement test for resolve in space_1
      // 1. Create test cases adjusted for space_1 context
      // 2. Verify EXACT_MATCH works in space_1
      // 3. Verify ALIAS_MATCH works (alias exists in space_1)
      // 4. Verify CONFLICT outcome is appropriate for space_1
      // 5. Verify DISABLED and DOES_NOT_EXIST fail appropriately
      // 6. Send GET requests to /s/space_1/api/saved_objects/resolve/{type}/{id}
    });
  });

  apiTest.describe('within space_2', () => {
    apiTest('should return 200/400/404', async ({ apiClient }) => {
      // TODO: Implement test for resolve in space_2
      // 1. Create test cases adjusted for space_2 context
      // 2. Verify EXACT_MATCH works in space_2
      // 3. Verify ALIAS_MATCH fails 404 (alias does not exist in space_2)
      // 4. Verify CONFLICT becomes EXACT_MATCH in space_2 (no alias conflict in this space)
      //    - The object that would have a conflict outcome in default/space_1 should have exactMatch outcome in space_2
      // 5. Verify DISABLED and DOES_NOT_EXIST fail appropriately
      // 6. Send GET requests to /s/space_2/api/saved_objects/resolve/{type}/{id}
    });
  });
});
