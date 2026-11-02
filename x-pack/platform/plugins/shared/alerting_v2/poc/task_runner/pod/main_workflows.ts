/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Pod process entry: Workflows Execution Engine's task types only. Env: ES_URL, ES_USERNAME/ES_PASSWORD, PORT (default 4102). */

import { startPod } from './server';
import { buildWorkflowsPod } from './entries/workflows';

const { registry } = buildWorkflowsPod();
startPod({ registry, port: Number(process.env.PORT ?? 4102) });
