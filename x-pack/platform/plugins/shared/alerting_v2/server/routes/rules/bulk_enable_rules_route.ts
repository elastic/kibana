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
import { bulkOperationParamsSchema, bulkOperationResponseSchema } from '@kbn/alerting-v2-schemas';
import type { BulkOperationParams } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { INTERNAL_ALERTING_V2_RULE_API_PATH } from '../constants';

@injectable()
export class BulkEnableRulesRoute {
  static method = 'post' as const;
  static path = `${INTERNAL_ALERTING_V2_RULE_API_PATH}/_bulk_enable`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static options = {
    access: 'internal',
    summary: 'Enable rules in bulk',
    tags: ['oas-tag:alerting-v2'],
  } as const;
  static validate = {
    request: {
      body: buildRouteValidationWithZod(bulkOperationParamsSchema),
    },
    response: {
      200: {
        body: () => bulkOperationResponseSchema,
        description: 'Indicates a successful call.',
      },
      400: {
        description: 'Indicates an invalid schema or parameters.',
      },
    },
  };

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, BulkOperationParams>,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {}

  async handle() {
    try {
      const { ids, filter } = this.request.body;
      const params = ids ? { ids } : { filter: filter ?? '' };
      const result = await this.rulesClient.bulkEnableRules(params);
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
