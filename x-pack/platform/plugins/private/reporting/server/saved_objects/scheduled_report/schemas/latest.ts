/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { rawNotificationSchema, rawScheduledReportSchema } from './v1';

export type RawNotification = TypeOf<typeof rawNotificationSchema>;
export type RawScheduledReport = TypeOf<typeof rawScheduledReportSchema>;
