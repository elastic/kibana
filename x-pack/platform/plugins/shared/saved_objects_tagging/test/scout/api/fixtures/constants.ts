/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TAGS_API_VERSION = '2023-10-31';

export const PUBLIC_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': TAGS_API_VERSION,
  'Content-Type': 'application/json;charset=UTF-8',
};

export const KBN_ARCHIVES = {
  tagsFunctionalBase:
    'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json',
} as const;
