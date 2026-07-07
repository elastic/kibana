/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

/**
 * Deployment-agnostic tag set with serverless observability targets removed.
 *
 * Stack alerts privilege tests rely on the `stackAlertsOnly` feature. It is registered
 * on every deployment, but the serverless observability project hides it via
 * `xpack.features.overrides` (see config/serverless.oblt.complete.yml), so those lanes
 * are excluded. Stateful observability is full Kibana and keeps the feature, so it stays.
 */
export const DEPLOYMENT_AGNOSTIC_WITHOUT_SERVERLESS_OBS = tags.deploymentAgnostic.filter(
  (tag) => !tags.serverless.observability.all.includes(tag)
);

export const ES_QUERY_RULE_PARAMS = {
  index: ['.kibana-event-log-*'],
  timeField: '@timestamp',
  esQuery: '{\n  "query":{\n    "match_all" : {}\n  }\n}',
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: '>',
  threshold: [0],
  searchType: 'esQuery',
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
  groupBy: 'all',
} as const;

// The .es-query rule type uses instance ID 'query matched' to identify the alert instance when group by is 'all'.
export const ES_QUERY_DEFAULT_INSTANCE_ID = 'query matched';
export const ES_QUERY_DEFAULT_INSTANCE_ID_ENCODED = encodeURIComponent(
  ES_QUERY_DEFAULT_INSTANCE_ID
);
