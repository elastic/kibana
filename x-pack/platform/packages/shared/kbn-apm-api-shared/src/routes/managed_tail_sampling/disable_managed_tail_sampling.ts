/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defineRoute } from '../types';
import type { ManagedTailSamplingResponse } from './types';

/**
 * Turns sampling off and keeps the saved policies, so it can be turned back on
 * without entering them again.
 */
export const disableManagedTailSamplingRoute = defineRoute<ManagedTailSamplingResponse>()({
  endpoint: 'POST /internal/managed_tail_sampling/_disable',
});
