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

apiTest.describe('_update', { tag: tags.ESS_ONLY }, () => {
  apiTest.beforeAll(async ({ kbnClient, apiClient }) => {
    // TODO: Implement test setup
    // 1. Create FTR spaces (default, space_1, space_2)
    // 2. Load saved objects data for default space from kbn_archiver fixture
    // 3. Load saved objects data for space_1 from kbn_archiver fixture
    // 4. Load saved objects data for space_2 from kbn_archiver fixture
    // 5. Load ES archiver data for update test cases
  });

  apiTest.afterAll(async ({ kbnClient, esClient }) => {
    // TODO: Implement cleanup
    // 1. Unload ES archiver data
    // 2. Delete all saved objects from Kibana index
    // 3. Delete FTR spaces
  });

  apiTest.describe('within the default space', () => {
    apiTest('should return 200/404/409', async ({ apiClient }) => {
      // TODO: Implement test for PUT /api/saved_objects/{type}/{id} in default space
      // 1. Create test cases for default space:
      //    - SINGLE_NAMESPACE_DEFAULT_SPACE (should return 200 - success)
      //    - SINGLE_NAMESPACE_SPACE_1 (should return 404 - not in default space)
      //    - SINGLE_NAMESPACE_SPACE_2 (should return 404)
      //    - MULTI_NAMESPACE_ALL_SPACES (should return 200)
      //    - MULTI_NAMESPACE_DEFAULT_AND_SPACE_1 (should return 200)
      //    - MULTI_NAMESPACE_ONLY_SPACE_1 (should return 404)
      //    - MULTI_NAMESPACE_ONLY_SPACE_2 (should return 404)
      //    - MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE (should return 200)
      //    - MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1 (should return 404)
      //    - NAMESPACE_AGNOSTIC (should return 200)
      //    - HIDDEN (should return 404 - hidden type)
      //    - ALIAS_CONFLICT_OBJ with upsert: false (should return 404 - doesn't exist yet)
      //    - ALIAS_CONFLICT_OBJ with upsert: true (should return 409 in default space - alias conflict)
      //    - DOES_NOT_EXIST (should return 404)
      // 2. For each test case send PUT request to /s/default/api/saved_objects/{type}/{id}
      // 3. Prepare request body with attributes to update
      // 4. For upsert tests, include upsert option in request body
      // 5. Verify response status (200 for success, 404 for not found, 409 for conflict)
      // 6. For successful updates verify:
      //    - Response contains updated object with new attributes
      //    - version field is incremented
      //    - namespaces array is correct
      // 7. For failed updates verify error message and statusCode
    });
  });

  apiTest.describe('within space_1', () => {
    apiTest('should return 200/404/409', async ({ apiClient }) => {
      // TODO: Implement test for update in space_1
      // 1. Create test cases adjusted for space_1 context
      // 2. Objects in space_1 should succeed
      // 3. Objects not in space_1 should fail 404
      // 4. Verify multi-namespace objects accessible from space_1
      // 5. Verify upsert with alias conflict in space_1 fails 409
      // 6. Send PUT requests to /s/space_1/api/saved_objects/{type}/{id}
    });
  });

  apiTest.describe('within space_2', () => {
    apiTest('should return 200/404/409', async ({ apiClient }) => {
      // TODO: Implement test for update in space_2
      // 1. Create test cases adjusted for space_2 context
      // 2. Objects in space_2 should succeed
      // 3. Objects not in space_2 should fail 404
      // 4. Verify multi-namespace objects accessible from space_2
      // 5. Verify upsert with alias conflict succeeds in space_2 (no alias there)
      // 6. Send PUT requests to /s/space_2/api/saved_objects/{type}/{id}
    });
  });
});
