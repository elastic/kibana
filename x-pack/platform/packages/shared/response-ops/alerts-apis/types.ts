/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { MuteCondition } from '@kbn/alerting-types';

export type ServerError = IHttpFetchError<ResponseErrorBody>;

export interface ToggleAlertParams {
  ruleId: string;
  alertInstanceId: string;
  /** ISO timestamp; when reached the mute expires automatically. */
  expiresAt?: string;
  /** Conditions under which the mute is automatically lifted. */
  conditions?: MuteCondition[];
  /** How conditions combine: 'any' = OR, 'all' = AND. Default 'any'. */
  conditionOperator?: 'any' | 'all';
}

/**
 * Map from rule ids to muted alert instance ids
 */
export type MutedAlerts = Record<string, string[]>;
