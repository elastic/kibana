/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTransientEsError } from '../../../services/retry_service';

/** Whether a dispatch operation failed for a reason that may clear up if it runs again. */
export const isTransientDispatchError = (error: Error): boolean => isTransientEsError(error);
