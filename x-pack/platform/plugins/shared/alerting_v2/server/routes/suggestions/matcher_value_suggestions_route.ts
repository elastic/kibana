/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { TypeOf } from '@kbn/config-schema';
import { inject, injectable } from 'inversify';
import { Request, Response } from '@kbn/core-di-server';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { INTERNAL_ALERTING_V2_SUGGESTIONS_API_PATH } from '../constants';
import { MatcherSuggestionsService } from '../../lib/services/matcher_suggestions_service/matcher_suggestions_service';

const suggestionsBodySchema = schema.object({
  field: schema.string(),
  query: schema.string(),
  filters: schema.maybe(schema.any()),
  fieldMeta: schema.maybe(schema.any()),
});

type SuggestionsBody = TypeOf<typeof suggestionsBodySchema>;

@injectable()
export class MatcherValueSuggestionsRoute {
  static method = 'post' as const;
  static path = INTERNAL_ALERTING_V2_SUGGESTIONS_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [
        ALERTING_V2_API_PRIVILEGES.notificationPolicies.read,
        ALERTING_V2_API_PRIVILEGES.rules.read,
      ],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      body: suggestionsBodySchema,
    },
  } as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, SuggestionsBody>,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(MatcherSuggestionsService)
    private readonly suggestionsService: MatcherSuggestionsService
  ) {}

  async handle() {
    const { field, query } = this.request.body;

    try {
      const values = await this.suggestionsService.getSuggestions(field, query);
      return this.response.ok({ body: values });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
