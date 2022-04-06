/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, IRouter } from 'kibana/server';

import { registerRoute as registerRoute_GET_cpu_profile } from './GET_cpu_profile';
import { registerRoute as registerRoute_GET_heap_snapshot } from './GET_heap_snapshot';
import { registerRoute as registerRoute_POST_webhook_rule_example } from './POST_webhook_rule_example';

export function registerRoutes(logger: Logger, router: IRouter): void {
  registerRoute_GET_cpu_profile(logger, router);
  registerRoute_GET_heap_snapshot(logger, router);
  registerRoute_POST_webhook_rule_example(logger, router);
}
