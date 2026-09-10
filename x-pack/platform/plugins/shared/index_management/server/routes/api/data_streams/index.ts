/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../../../types';

import { registerGetOneRoute, registerGetAllRoute } from './register_get_route';
import { registerGetFailureStoreSettingsRoute } from './register_get_failure_store_settings_route';
import { registerDeleteRoute } from './register_delete_route';
import {
  registerPutDataRetention,
  registerPutDataLifecycle,
  registerPutDataStreamFailureStore,
  registerPutDataStreamSettings,
} from './register_put_route';
import { registerPostOneApplyLatestMappings, registerPostOneRollover } from './register_post_route';
import { registerGetIlmPoliciesRoute } from './register_get_ilm_policies_route';

export function registerDataStreamRoutes(dependencies: RouteDependencies) {
  registerGetOneRoute(dependencies);
  registerPostOneApplyLatestMappings(dependencies);
  registerPostOneRollover(dependencies);
  registerGetAllRoute(dependencies);
  registerGetFailureStoreSettingsRoute(dependencies);
  registerDeleteRoute(dependencies);
  registerPutDataRetention(dependencies);
  registerPutDataLifecycle(dependencies);
  registerPutDataStreamSettings(dependencies);
  registerPutDataStreamFailureStore(dependencies);
  registerGetIlmPoliciesRoute(dependencies);
}
