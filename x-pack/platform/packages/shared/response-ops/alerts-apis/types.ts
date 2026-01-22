/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';

export type ServerError = IHttpFetchError<ResponseErrorBody>;

export interface ToggleAlertParams {
  ruleId: string;
  alertInstanceId: string;
}

/**
 * Map from rule ids to muted alert instance ids
 */
export type MutedAlerts = Record<string, string[]>;
