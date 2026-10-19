/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';

/** Epoch milliseconds with sub-ms resolution, comparable across worker threads. */
export const epochNow = (): number => performance.timeOrigin + performance.now();
