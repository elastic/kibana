/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defineRoute } from '../types';
import type { ManagedTailSamplingResponse } from './types';

/**
 * Turns sampling back on with the policies already stored. The server validates them
 * again before applying: 400 with diagnostics when they no longer pass, 409 when
 * nothing has been saved yet. Calling it while enabled returns the current state.
 */
export const enableManagedTailSamplingRoute = defineRoute<ManagedTailSamplingResponse>()({
  endpoint: 'POST /internal/managed_tail_sampling/_enable',
});
