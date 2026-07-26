/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';
import {
  API_BASE_PATH as UPGRADE_ASSISTANT_API_BASE_PATH,
  APPS_WITH_DEPRECATION_LOGS,
  DEPRECATION_LOGS_INDEX,
  DEPRECATION_LOGS_ORIGIN_FIELD,
} from '../../../../common/constants';

export { APPS_WITH_DEPRECATION_LOGS, DEPRECATION_LOGS_INDEX, DEPRECATION_LOGS_ORIGIN_FIELD };

export const UPGRADE_ASSISTANT_API_TAGS = tags.stateful.classic;
export const UPGRADE_ASSISTANT_API_LOCAL_TAGS = ['@local-stateful-classic'];

export const API_BASE_PATH = UPGRADE_ASSISTANT_API_BASE_PATH.replace(/^\//, '');

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const NO_PRIVILEGES_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
  },
  kibana: [],
};

export const CLOUD_SNAPSHOT_REPOSITORY = 'found-snapshots';
export const INDEX_SETTINGS_TEST_INDEX = 'update_settings_test_index';
export const INDEX_SETTINGS_TO_REMOVE = ['refresh_interval'];

export const CLUSTER_SETTINGS_TO_REMOVE = [
  'cluster.routing.allocation.exclude._tier',
  'cluster.routing.allocation.include._tier',
];

export const TEST_REMOTE_CLUSTER_NAME = 'test_cluster';
export const TEST_REMOTE_CLUSTER_SEEDS = ['127.0.0.1:9400'];

export const DEPRECATION_LOG_CHECKPOINT = '2000-01-01T00:00:00.000Z';
