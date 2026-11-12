/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defineRoute } from '../types';
import type { TailSamplingResponse } from './types';

/**
 * Turns sampling off and keeps the saved config, so it can be turned back on
 * without entering it again. Calling it while disabled returns the current state.
 */
export const disableTailSamplingRoute = defineRoute<TailSamplingResponse>()({
  endpoint: 'POST /internal/tail_sampling/_disable',
});
