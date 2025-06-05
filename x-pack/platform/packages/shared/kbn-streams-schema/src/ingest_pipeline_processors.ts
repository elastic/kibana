/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

export type ElasticsearchProcessorType = keyof IngestProcessorContainer;

const ensureFullProcessorTypeList = <T extends readonly ElasticsearchProcessorType[]>(
  types: ElasticsearchProcessorType extends T[number]
    ? T
    : `Missing elements from union: "${Exclude<ElasticsearchProcessorType, T[number]>}"`
) => types as T;

export const elasticsearchProcessorTypes = ensureFullProcessorTypeList([
  'append',
  'attachment',
  'bytes',
  'circle',
  'community_id',
  'convert',
  'csv',
  'date',
  'date_index_name',
  'dissect',
  'dot_expander',
  'drop',
  'enrich',
  'fail',
  'fingerprint',
  'foreach',
  'ip_location',
  'geo_grid',
  'geoip',
  'grok',
  'gsub',
  'html_strip',
  'inference',
  'join',
  'json',
  'kv',
  'lowercase',
  'network_direction',
  'pipeline',
  'redact',
  'registered_domain',
  'remove',
  'rename',
  'reroute',
  'script',
  'set',
  'set_security_user',
  'sort',
  'split',
  'terminate',
  'trim',
  'uppercase',
  'urldecode',
  'uri_parts',
  'user_agent',
] as const);
