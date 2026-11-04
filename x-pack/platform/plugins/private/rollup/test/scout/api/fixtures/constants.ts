/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRole } from '@kbn/scout';

// Mirrors `API_BASE_PATH` in the plugin's `common/index.ts`; the Scout tests are a separate TS
// project, so the value is restated rather than imported across that boundary.
export const API_BASE_PATH = 'api/rollup';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

// Fields the rollup jobs under test group and aggregate on.
export const INDEX_TO_ROLLUP_MAPPINGS: MappingTypeMapping = {
  properties: {
    testTotalField: { type: 'long' },
    testTagField: { type: 'keyword' },
    testCreatedField: { type: 'date' },
  },
};

// Rollup jobs and indices are cluster-global and the cluster may be shared, so every resource this
// suite creates carries this prefix (plus a run-unique suffix) and cleanup only touches names under it.
export const TEST_RESOURCE_PREFIX = 'rollup-api';

export const SOURCE_INDEX_PREFIX = `${TEST_RESOURCE_PREFIX}-test`;
export const TARGET_INDEX_PREFIX = `${TEST_RESOURCE_PREFIX}-target`;
export const MOCK_INDEX_PREFIX = `${TEST_RESOURCE_PREFIX}-mock`;
export const JOB_ID_PREFIX = `${TEST_RESOURCE_PREFIX}-job`;

// The rollup routes delegate authorization to ES (no Kibana privileges needed): rollup cluster
// actions plus read/manage access scoped to the indices the suite creates.
export const ROLLUP_ADMIN_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['manage_rollup'],
    indices: [
      {
        names: [`${TEST_RESOURCE_PREFIX}-*`],
        privileges: ['manage', 'read', 'view_index_metadata'],
      },
    ],
  },
  kibana: [],
};
