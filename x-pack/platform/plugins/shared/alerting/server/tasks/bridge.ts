/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { AlertingTasksStart } from '.';

/** The rules client the plugin starts in Kibana; a task pod has no rule type registry to build one. */
export const alertingBridge = createTasksKibanaBridge<unknown, AlertingTasksStart>();
