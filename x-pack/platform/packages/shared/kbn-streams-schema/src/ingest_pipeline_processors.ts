/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

export type ElasticsearchProcessorType = keyof IngestProcessorContainer;

type IsArraySynced<TUnion extends string, TArray extends readonly string[]> =
  // First, check if all elements in TArray are actually part of TUnion.
  Exclude<TArray[number], TUnion> extends never
    ? // Check if all members of TUnion are present in TArray.
      Exclude<TUnion, TArray[number]> extends never
      ? true // All checks passed, array is synced.
      : {
          readonly _errorType: 'Missing elements from union';
          readonly missing: Exclude<TUnion, TArray[number]>;
        }
    : {
        readonly _errorType: 'Array contains elements not in union';
        readonly invalid: Exclude<TArray[number], TUnion>;
      };

function ensureFullProcessorTypeList<const Arr extends readonly string[]>(
  arr: IsArraySynced<ElasticsearchProcessorType, Arr> extends true
    ? Arr
    : IsArraySynced<ElasticsearchProcessorType, Arr>
): Arr {
  return arr as Arr;
}

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
]);
