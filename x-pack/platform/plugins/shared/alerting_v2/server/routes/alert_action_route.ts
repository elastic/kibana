/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Request, Response } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { ALERTING_V2_API_PRIVILEGES } from '../lib/security/privileges';
import { INTERNAL_ALERTING_V2_ALERT_API_PATH } from './constants';

const ackBodySchema = z.object({}).optional();
const unackBodySchema = z.object({});
const tagBodySchema = z.object({ tags: z.array(z.string()) });
const untagBodySchema = z.object({ tags: z.array(z.string()) });
const snoozeBodySchema = z.object({});
const unsnoozeBodySchema = z.object({});
const setSeverityBodySchema = z.object({ sev_level: z.number() });
const clearSeverityBodySchema = z.object({});
const activateBodySchema = z.object({ reason: z.string() });
const deactivateBodySchema = z.object({ reason: z.string() });

const alertActionBodySchema = z.union([
  ackBodySchema,
  unackBodySchema,
  tagBodySchema,
  untagBodySchema,
  snoozeBodySchema,
  unsnoozeBodySchema,
  setSeverityBodySchema,
  clearSeverityBodySchema,
  activateBodySchema,
  deactivateBodySchema,
]);

const alertActionParamsSchema = z.object({
  alert_series_id: z.string(),
  action_type: z.enum([
    'ack',
    'unack',
    'tag',
    'untag',
    'snooze',
    'unsnooze',
    'set_severity',
    'clear_severity',
    'activate',
    'deactivate',
  ]),
});

export type AlertActionParams = z.infer<typeof alertActionParamsSchema>;
export type AlertActionBody = z.infer<typeof alertActionBodySchema>;

@injectable()
export class AlertActionRoute {
  static method = 'post' as const;
  static path = `${INTERNAL_ALERTING_V2_ALERT_API_PATH}/{alert_series_id}/action/{action_type}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      params: alertActionParamsSchema,
      body: alertActionBodySchema,
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<AlertActionParams, unknown, AlertActionBody>,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  async handle() {
    return this.response.ok({ body: {} });
  }
}
