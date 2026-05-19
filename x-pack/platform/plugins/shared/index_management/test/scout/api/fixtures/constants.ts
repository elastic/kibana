/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const CAPABILITIES_API_PATH = '/api/core/capabilities';
export const API_BASE_PATH = '/api/index_management';
export const INTERNAL_API_BASE_PATH = '/internal/index_management';

export const INDEX_PATTERNS = ['test*'];

const expectedIndexKeys = [
  'health',
  'hidden',
  'status',
  'name',
  'uuid',
  'primary',
  'replica',
  'documents',
  'documents_deleted',
  'size',
  'primary_size',
  'isFrozen',
  'aliases',
  'isFollowerIndex',
  'ilm',
  'isRollupIndex',
];

export const SORTED_EXPECTED_INDEX_KEYS = expectedIndexKeys.sort();
