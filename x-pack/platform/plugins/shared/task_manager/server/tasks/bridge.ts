/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '../plugin';

/**
 * In Kibana the `server` entry owns the real Task Manager; its `tasks` entry hands that out. In a
 * task pod there is no `server` entry, and the `tasks` entry builds a standalone implementation.
 */
export const taskManagerBridge = createTasksKibanaBridge<
  TaskManagerSetupContract,
  TaskManagerStartContract
>();
