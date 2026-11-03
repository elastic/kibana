/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { RuleRegistryTasksStart } from '.';

/** The RAC client the plugin starts in Kibana; a task pod has no rule data service to build one. */
export const ruleRegistryBridge = createTasksKibanaBridge<unknown, RuleRegistryTasksStart>();
