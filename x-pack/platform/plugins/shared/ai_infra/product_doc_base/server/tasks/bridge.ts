/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';
import type { ProductDocBaseTasksStart } from '.';

/**
 * The plugin's real start contract in Kibana, which has registered the saved object type; a task
 * pod builds its own read-only one.
 */
export const productDocBaseBridge = createTasksKibanaBridge<true, ProductDocBaseTasksStart>();
