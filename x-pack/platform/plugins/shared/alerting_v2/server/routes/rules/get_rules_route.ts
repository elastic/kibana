/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request, Response } from '@kbn/core-di-server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { findRulesResponseSchema } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { ALERTING_V2_RULE_API_PATH } from '../constants';

const getRulesQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().describe('The page number to return.'),
  perPage: z.coerce
    .number()
    .min(1)
    .max(1000)
    .optional()
    .describe('The number of rules to return per page.'),

  filter: z.string().optional().describe('A KQL string to filter the rules.'),
  search: z.string().optional().describe('A text string to search across rule fields.'),
});

@injectable()
export class GetRulesRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_RULE_API_PATH}`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static options = {
    access: 'public',
    summary: 'List rules',
    tags: ['oas-tag:alerting-v2'],
    availability: { stability: 'experimental' },
  } as const;
  static validate = {
    request: {
      query: buildRouteValidationWithZod(getRulesQuerySchema),
    },
    response: {
      200: {
        body: () => findRulesResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<unknown, z.infer<typeof getRulesQuerySchema>, unknown>,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {}

  async handle() {
    try {
      const result = await this.rulesClient.findRules({
        page: this.request.query.page,
        perPage: this.request.query.perPage,
        filter: this.request.query.filter,
        search: this.request.query.search,
      });
      return this.response.ok({ body: result });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
