/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Pod process entry: Alerting v2's task types only. Env: ES_URL, ES_USERNAME/ES_PASSWORD, PORT (default 4100). */

import { startPod } from './server';
import { buildAlertingV2Pod } from './entries/alerting_v2';

const { registry } = buildAlertingV2Pod();
startPod({ registry, port: Number(process.env.PORT ?? 4100) });
