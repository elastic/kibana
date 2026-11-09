/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { StorageServiceContract } from '../services/storage_service/storage_service';

/**
 * Storage service the alert actions client writes `.alert-actions` and its synthetic
 * `.rule-events` documents through. Defaults to the request-scoped service (the caller's
 * credentials); the start contract rebinds it to the internal service.
 */
export const AlertActionsStorageToken = createToken<StorageServiceContract>(
  'alerting_v2.AlertActionsStorage'
);
