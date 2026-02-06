/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';

export async function withDispatcherSpan<T>(name: string, cb: () => Promise<T>): Promise<T> {
  return withSpan({ name, type: 'dispatcher', labels: { plugin: 'alerting_v2' } }, cb);
}
