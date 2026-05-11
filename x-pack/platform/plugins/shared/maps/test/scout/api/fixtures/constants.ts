/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};

export const INTERNAL_HEADERS_V2 = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2',
};

export const ES_ARCHIVES = {
  logstashFunctional: 'x-pack/platform/test/fixtures/es_archives/logstash_functional',
  mapsData: 'x-pack/platform/test/fixtures/es_archives/maps/data',
};

export const KBN_ARCHIVES = {
  maps: 'x-pack/platform/test/functional/fixtures/kbn_archives/maps.json',
};
