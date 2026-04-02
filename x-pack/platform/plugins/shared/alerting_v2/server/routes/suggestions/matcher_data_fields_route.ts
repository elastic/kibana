/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { Response } from '@kbn/core-di-server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { KibanaResponseFactory } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { MatcherSuggestionsService } from '../../lib/services/matcher_suggestions_service/matcher_suggestions_service';
import { ALERTING_V2_NOTIFICATION_POLICY_API_PATH } from '../constants';

@injectable()
export class MatcherDataFieldsRoute {
  static method = 'get' as const;
  static path = `${ALERTING_V2_NOTIFICATION_POLICY_API_PATH}/suggestions/data_fields`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.notificationPolicies.read],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = false as const;

  constructor(
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(MatcherSuggestionsService)
    private readonly suggestionsService: MatcherSuggestionsService
  ) {}

  async handle() {
    try {
      const fields = await this.suggestionsService.getDataFieldNames();
      return this.response.ok({ body: fields });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
