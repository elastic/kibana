/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REINDEX_SERVICE_BASE_PATH } from '../../../../common';

// `apiClient` expects a path relative to the Kibana base URL (no leading slash).
export const API_BASE_PATH = REINDEX_SERVICE_BASE_PATH.replace(/^\//, '');

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const SOURCE_INDEX = 'dummydata';

// Target index name the client asks the reindex API to create. The server reindexes
// into whatever name the caller provides, so this is an arbitrary (but stable) value;
// it mirrors what the FTR suite computed via `generateNewIndexName('dummydata', v8)`.
export const REINDEXED_INDEX = 'reindexed-v8-dummydata';
