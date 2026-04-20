/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { AlertingTaskDefinition } from '../../services/task_run_scope_service/create_task_runner';
import { ApiKeyInvalidationTaskRunner } from './task_runner';

export const INVALIDATE_API_KEYS_TASK_TYPE = 'alerting_v2:invalidate_api_keys' as const;
export const INVALIDATE_API_KEYS_TASK_ID = 'alerting_v2:invalidate_api_keys:1.0.0' as const;
export const INVALIDATE_API_KEYS_TASK_INTERVAL = '5m';
export const INVALIDATE_API_KEYS_TASK_REMOVAL_DELAY = '1h';

export const ApiKeyInvalidationTaskDefinition: AlertingTaskDefinition<ApiKeyInvalidationTaskRunner> =
  {
    taskType: INVALIDATE_API_KEYS_TASK_TYPE,
    title: 'Alerting v2 API key invalidation',
    timeout: INVALIDATE_API_KEYS_TASK_INTERVAL,
    maxAttempts: 1,
    paramsSchema: schema.object({}),
    taskRunnerClass: ApiKeyInvalidationTaskRunner,
    requiresFakeRequest: false,
  };
