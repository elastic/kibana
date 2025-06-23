/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveSpan } from '@kbn/tracing';

export async function withAlertingSpan<T>(name: string, cb: () => Promise<T>): Promise<T> {
  return withActiveSpan(name, { attributes: { 'labels.plugin': 'alerting' } }, cb);
}
