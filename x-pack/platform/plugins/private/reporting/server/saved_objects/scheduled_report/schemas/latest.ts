/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { rawNotificationSchema, rawScheduledReportSchema } from './v1';

type Mutable<T> = { -readonly [P in keyof T]: T[P] extends object ? Mutable<T[P]> : T[P] };

export type RawNotification = Mutable<TypeOf<typeof rawNotificationSchema>>;
export type RawScheduledReport = Mutable<TypeOf<typeof rawScheduledReportSchema>>;
