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

apiTest.describe('_bulk_get', { tag: tags.ESS_ONLY }, () => {
  apiTest.beforeAll(async ({ kbnClient, apiClient }) => {
    // TODO: Implement test setup
    // 1. Create FTR spaces (default, space_1, space_2)
    // 2. Load saved objects data for default space from kbn_archiver fixture
    // 3. Load saved objects data for space_1 from kbn_archiver fixture
    // 4. Load saved objects data for space_2 from kbn_archiver fixture
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    // TODO: Implement cleanup
    // 1. Delete all saved objects from Kibana index
    // 2. Delete FTR spaces
  });

  apiTest.describe('within the default space', () => {
    apiTest('should return 200', async ({ apiClient }) => {
      // TODO: Implement test for POST /api/saved_objects/_bulk_get in default space
      // 1. Create test cases array with objects to retrieve:
      //    - SINGLE_NAMESPACE_DEFAULT_SPACE (should succeed)
      //    - SINGLE_NAMESPACE_SPACE_1 (should fail 404)
      //    - SINGLE_NAMESPACE_SPACE_2 (should fail 404)
      //    - MULTI_NAMESPACE_ALL_SPACES (should succeed)
      //    - MULTI_NAMESPACE_DEFAULT_AND_SPACE_1 (should succeed)
      //    - MULTI_NAMESPACE_ONLY_SPACE_1 (should fail 404)
      //    - MULTI_NAMESPACE_ONLY_SPACE_2 (should fail 404)
      //    - MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE (should succeed)
      //    - MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1 (should fail 404)
      //    - NAMESPACE_AGNOSTIC (should succeed)
      //    - HIDDEN (should fail 400)
      //    - DOES_NOT_EXIST (should fail 404)
      //    - SINGLE_NAMESPACE_SPACE_2 with namespaces: ['x', 'y'] (should fail 400 - cannot search in multiple spaces)
      //    - SINGLE_NAMESPACE_SPACE_2 with namespaces: [SPACE_2_ID] (should fail 404 in default space)
      //    - MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1 with namespaces: [ALL_SPACES_ID] (should fail 400)
      //    - MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1 with namespaces: [SPACE_1_ID] (should fail 404)
      //    - MULTI_NAMESPACE_DEFAULT_AND_SPACE_1 with namespaces: [SPACE_2_ID] (should fail 404)
      //    - MULTI_NAMESPACE_ALL_SPACES with namespaces: [SPACE_2_ID, 'x'] (should succeed - unknown space ignored)
      //    - MULTI_NAMESPACE_ONLY_SPACE_1 with namespaces: [ALL_SPACES_ID] (should succeed)
      // 2. Prepare request body as array of {type, id, namespaces?}
      // 3. Send POST request to /s/default/api/saved_objects/_bulk_get
      // 4. Verify response status is 200
      // 5. Verify saved_objects array length matches request
      // 6. For each object verify:
      //    - Successful objects have correct type, id, attributes, namespaces
      //    - Failed objects have error with correct statusCode and message
    });
  });

  apiTest.describe('within space_1', () => {
    apiTest('should return 200', async ({ apiClient }) => {
      // TODO: Implement test for POST /api/saved_objects/_bulk_get in space_1
      // 1. Create test cases array adjusted for space_1 context
      // 2. Objects existing in space_1 should succeed
      // 3. Objects not in space_1 should fail with 404
      // 4. Verify multi-namespace objects are accessible based on their namespaces
      // 5. Verify namespace-agnostic objects are always accessible
      // 6. Send POST request to /s/space_1/api/saved_objects/_bulk_get
      // 7. Verify response matches expected outcomes for space_1
    });
  });

  apiTest.describe('within space_2', () => {
    apiTest('should return 200', async ({ apiClient }) => {
      // TODO: Implement test for POST /api/saved_objects/_bulk_get in space_2
      // 1. Create test cases array adjusted for space_2 context
      // 2. Objects existing in space_2 should succeed
      // 3. Objects not in space_2 should fail with 404
      // 4. Verify multi-namespace objects are accessible based on their namespaces
      // 5. Verify namespace-agnostic objects are always accessible
      // 6. Send POST request to /s/space_2/api/saved_objects/_bulk_get
      // 7. Verify response matches expected outcomes for space_2
    });
  });
});
