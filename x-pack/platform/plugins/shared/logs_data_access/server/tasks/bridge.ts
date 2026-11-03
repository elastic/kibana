/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { registerServices } from '../services/register_services';

/**
 * The plugin's contracts in Kibana, so a tasks entry that boots in the same process hands them out
 * instead of registering the settings and building the services a second time. A task pod has no
 * `server` entry and builds its own.
 */
export const logsDataAccessBridge = createTasksKibanaBridge<
  true,
  { services: ReturnType<typeof registerServices> }
>();
