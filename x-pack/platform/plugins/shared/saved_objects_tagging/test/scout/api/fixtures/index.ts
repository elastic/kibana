/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { apiTest as baseApiTest } from '@kbn/scout';

export const apiTest = baseApiTest.extend<ScoutTestFixtures, ScoutWorkerFixtures>({});

export {
  COMMON_HEADERS,
  KBN_ARCHIVES,
  NO_KIBANA_ACCESS_ROLE,
  SO_MANAGEMENT_WRITE_ROLE,
  SO_TAGGING_READ_ROLE,
  SO_TAGGING_WRITE_ROLE,
  DASHBOARD_WRITE_ROLE,
  VISUALIZE_WRITE_ROLE,
  TELEMETRY_HEADERS,
  PUBLIC_HEADERS,
  TAGS_API_VERSION,
} from './constants';
