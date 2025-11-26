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

apiTest.describe('_bulk_delete', { tag: tags.ESS_ONLY }, () => {
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
      // TODO: Implement test for POST /api/saved_objects/_bulk_delete in default space
      // 1. Create test cases array with objects to delete:
      //    - SINGLE_NAMESPACE_DEFAULT_SPACE (should succeed)
      //    - SINGLE_NAMESPACE_SPACE_1 (should fail 404 - not in default space)
      //    - SINGLE_NAMESPACE_SPACE_2 (should fail 404)
      //    - MULTI_NAMESPACE_ALL_SPACES (should fail 400 - exists in multiple spaces)
      //    - MULTI_NAMESPACE_ALL_SPACES with force: true (should succeed)
      //    - MULTI_NAMESPACE_DEFAULT_AND_SPACE_1 (should fail 400 in default space)
      //    - MULTI_NAMESPACE_DEFAULT_AND_SPACE_1 with force: true (should succeed)
      //    - MULTI_NAMESPACE_ONLY_SPACE_1 (should fail 404)
      //    - MULTI_NAMESPACE_ONLY_SPACE_2 (should fail 404)
      //    - MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE (should succeed)
      //    - MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1 (should fail 404)
      //    - NAMESPACE_AGNOSTIC (should succeed)
      //    - ALIAS_DELETE_INCLUSIVE with force: true (should succeed)
      //    - ALIAS_DELETE_EXCLUSIVE with force: true (should succeed)
      //    - HIDDEN (should fail 400 - hidden type)
      //    - DOES_NOT_EXIST (should fail 404)
      // 2. Prepare request body as array of {type, id, force?}
      // 3. Send POST request to /s/default/api/saved_objects/_bulk_delete
      // 4. Verify response status is 200
      // 5. Verify statuses array contains results for each object
      // 6. For each status verify:
      //    - Successful deletes have success: true
      //    - Failed deletes have success: false and error with correct statusCode/message
      // 7. Verify deleted objects are actually removed from the space
    });
  });

  apiTest.describe('within space_1', () => {
    apiTest('should return 200', async ({ apiClient }) => {
      // TODO: Implement test for POST /api/saved_objects/_bulk_delete in space_1
      // 1. Create test cases array adjusted for space_1 context
      // 2. Objects in space_1 should succeed or require force flag
      // 3. Objects not in space_1 should fail 404
      // 4. Multi-namespace objects need force: true if in multiple spaces
      // 5. Send POST request to /s/space_1/api/saved_objects/_bulk_delete
      // 6. Verify response matches expected outcomes for space_1
    });
  });

  apiTest.describe('within space_2', () => {
    apiTest('should return 200', async ({ apiClient }) => {
      // TODO: Implement test for POST /api/saved_objects/_bulk_delete in space_2
      // 1. Create test cases array adjusted for space_2 context
      // 2. Objects in space_2 should succeed or require force flag
      // 3. Objects not in space_2 should fail 404
      // 4. Multi-namespace objects need force: true if in multiple spaces
      // 5. Send POST request to /s/space_2/api/saved_objects/_bulk_delete
      // 6. Verify response matches expected outcomes for space_2
    });
  });
});
