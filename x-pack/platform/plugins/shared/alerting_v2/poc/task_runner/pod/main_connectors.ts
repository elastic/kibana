/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Pod process entry: Stage B2's minimal connector set only. Env: ES_URL, ES_USERNAME/ES_PASSWORD, PORT (default 4103). */

import { startPod } from './server';
import { buildConnectorsPod } from './entries/connectors';

const { registry } = buildConnectorsPod();
startPod({ registry, port: Number(process.env.PORT ?? 4103) });
