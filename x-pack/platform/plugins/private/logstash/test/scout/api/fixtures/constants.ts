/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchRoleDescriptor } from '@kbn/scout';

export const API_PATHS = {
  CLUSTER: 'api/logstash/cluster',
  PIPELINE: (id: string) => `api/logstash/pipeline/${id}`,
  PIPELINES: 'api/logstash/pipelines',
  PIPELINES_DELETE: 'api/logstash/pipelines/delete',
};

export const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
};

export const PIPELINE_IDS = {
  TWEETS_AND_BEATS: 'tweets_and_beats',
  FAST_GENERATOR: 'fast_generator',
  /** Unique IDs for the bulk-delete test */
  BULK_DELETE_1: 'scout_bulk_delete_1',
  BULK_DELETE_2: 'scout_bulk_delete_2',
};

/** Expected response body for GET /api/logstash/pipeline/tweets_and_beats */
export const EXPECTED_TWEETS_AND_BEATS_PIPELINE = {
  id: 'tweets_and_beats',
  description: 'ingest tweets and beats',
  username: 'elastic',
  pipeline:
    'input {\n    twitter {\n        consumer_key => "enter_your_consumer_key_here"\n        consumer_secret => "enter_your_secret_here"\n        keywords => ["cloud"]\n        oauth_token => "enter_your_access_token_here"\n        oauth_token_secret => "enter_your_access_token_secret_here"\n    }\n    beats {\n        port => "5043"\n    }\n}\noutput {\n    elasticsearch {\n        hosts => ["IP Address 1:port1", "IP Address 2:port2", "IP Address 3"]\n    }\n}',
  settings: {},
};

/** Minimum ES privileges required to manage Logstash pipelines */
export const LOGSTASH_MANAGER_ROLE: ElasticsearchRoleDescriptor = {
  cluster: ['manage_logstash_pipelines'],
};

/** Minimum ES privileges required to call GET /api/logstash/cluster (proxies ES info()) */
export const LOGSTASH_CLUSTER_ROLE: ElasticsearchRoleDescriptor = {
  cluster: ['monitor'],
};
