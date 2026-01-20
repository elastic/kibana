/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { Response } from '@kbn/core-di-server';
import type { KibanaResponseFactory, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import type { Logger as KibanaLogger } from '@kbn/logging';
import { Logger } from '@kbn/core-di';
import { ALERTING_V2_API_PRIVILEGES } from '../lib/security/privileges';
import type { QueryServiceContract } from '../lib/services/query_service/query_service';
import { QueryService } from '../lib/services/query_service/query_service';

@injectable()
export class GetStreamingRoute {
  static method = 'get' as const;
  static path = `/internal/alerting/v2/streaming`;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };
  static options = { access: 'internal' } as const;
  static validate = {} as const;

  constructor(
    @inject(Logger) private readonly logger: KibanaLogger,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(QueryService) private readonly queryService: QueryServiceContract
  ) {}

  async handle() {
    try {
      let rowCount = 0;

      // Process rows as they arrive (true streaming)
      for await (const rowObject of this.queryService.executeQueryStreaming({
        query: 'FROM .alerts-events*',
        dropNullColumns: false,
        allowPartialResults: true,
      })) {
        // Log each row as it becomes available
        this.logger.info(`ESQL Row Result: ${JSON.stringify(rowObject)}`);
        rowCount++;
      }

      return this.response.ok({
        body: { message: 'Streaming completed', rowCount },
      });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}
