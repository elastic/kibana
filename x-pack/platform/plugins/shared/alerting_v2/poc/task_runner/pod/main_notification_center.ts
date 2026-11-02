/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Pod process entry: Notification Center's cleanup task only. Env: ES_URL, ES_USERNAME/ES_PASSWORD, PORT (default 4101). */

import { startPod } from './server';
import { buildNotificationCenterPod } from './entries/notification_center';

const { registry } = buildNotificationCenterPod();
startPod({ registry, port: Number(process.env.PORT ?? 4101) });
