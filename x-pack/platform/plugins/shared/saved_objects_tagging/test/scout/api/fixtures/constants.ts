/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

export const KBN_ARCHIVES = {
  FUNCTIONAL_BASE:
    'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json',
  BULK_ASSIGN:
    'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/bulk_assign/data.json',
  DELETE_WITH_REFERENCES:
    'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/delete_with_references/data.json',
} as const;
