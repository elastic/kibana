/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { ActionsTasksSetup, ActionsTasksStart } from './runtime';

/** The runtime the Actions plugin builds in Kibana; a task pod builds its own. */
export const actionsBridge = createTasksKibanaBridge<ActionsTasksSetup, ActionsTasksStart>();
