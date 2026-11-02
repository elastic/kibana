/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';

/** Set once the `server` entry has registered the maintenance window saved object type. */
export const maintenanceWindowsBridge = createTasksKibanaBridge<true, unknown>();
