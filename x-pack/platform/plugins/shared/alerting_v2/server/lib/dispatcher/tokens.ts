/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { DispatcherService } from './dispatcher';

/**
 * DispatcherService singleton
 */
export const DispatcherServiceInternalToken = createToken<DispatcherService>(
  'alerting_v2.DispatcherServiceInternal'
);
