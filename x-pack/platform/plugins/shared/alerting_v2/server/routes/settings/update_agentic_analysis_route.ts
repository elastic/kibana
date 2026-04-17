/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { inject, injectable } from 'inversify';
import { CoreStart, Request } from '@kbn/core-di-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import type { ApiKeyServiceContract } from '../../lib/services/api_key_service/api_key_service';
import { ApiKeyService } from '../../lib/services/api_key_service/api_key_service';
import {
  AGENTIC_ANALYSIS_SETTINGS_TYPE,
  AGENTIC_ANALYSIS_SETTINGS_ID,
} from './agentic_analysis_constants';
import { AgenticAnalysisSavedObjectsClientToken } from './agentic_analysis_tokens';

const updateSchema = z.object({
  enabled: z.boolean(),
});

type UpdateBody = z.infer<typeof updateSchema>;

@injectable()
export class UpdateAgenticAnalysisRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = '/api/alerting/v2/settings/agentic-analysis';

  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };

  static routeOptions = {
    summary: 'Update agentic analysis settings',
  } as const;

  static validate = {
    request: {
      body: buildRouteValidationWithZod(updateSchema),
    },
  };

  protected readonly routeName = 'update agentic analysis settings';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request)
    private readonly request: KibanaRequest<unknown, unknown, UpdateBody>,
    @inject(AgenticAnalysisSavedObjectsClientToken)
    private readonly soClient: SavedObjectsClientContract,
    @inject(ApiKeyService)
    private readonly apiKeyService: ApiKeyServiceContract,
    @inject(CoreStart('security'))
    private readonly securityService: SecurityServiceStart
  ) {
    super(ctx);
  }

  protected async execute() {
    const { enabled } = this.request.body;
    const now = new Date().toISOString();

    if (enabled) {
      return this.enable(now);
    }
    return this.disable(now);
  }

  private async enable(now: string) {
    const username =
      this.securityService.authc.getCurrentUser(this.request)?.username ?? 'unknown';

    const apiKeyAttrs = await this.apiKeyService.create('alerting-v2-agentic-analysis');

    const attributes = {
      enabled: true,
      auth: {
        apiKey: apiKeyAttrs.apiKey,
        owner: apiKeyAttrs.owner,
        createdByUser: apiKeyAttrs.createdByUser,
      },
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.soClient.create(AGENTIC_ANALYSIS_SETTINGS_TYPE, attributes, {
        id: AGENTIC_ANALYSIS_SETTINGS_ID,
        overwrite: true,
      });
    } catch (err: unknown) {
      this.ctx.logger.error(
        `Failed to save agentic analysis settings: ${(err as Error).message}`
      );
      throw err;
    }

    this.ctx.logger.info(
      `Agentic analysis enabled by "${username}" with API key owned by "${apiKeyAttrs.owner}"`
    );

    return this.ctx.response.ok({
      body: {
        enabled: true,
        owner: apiKeyAttrs.owner,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  private async disable(now: string) {
    try {
      const existing = await this.soClient.get(
        AGENTIC_ANALYSIS_SETTINGS_TYPE,
        AGENTIC_ANALYSIS_SETTINGS_ID
      );

      const attrs = existing.attributes as { auth?: { apiKey?: string } };
      if (attrs.auth?.apiKey) {
        await this.apiKeyService.markApiKeysForInvalidation([attrs.auth.apiKey]);
      }
    } catch (err: unknown) {
      const soErr = err as { output?: { statusCode?: number } };
      if (soErr.output?.statusCode !== 404) {
        throw err;
      }
    }

    await this.soClient.create(
      AGENTIC_ANALYSIS_SETTINGS_TYPE,
      {
        enabled: false,
        auth: { apiKey: '', owner: '', createdByUser: false },
        createdAt: now,
        updatedAt: now,
      },
      { id: AGENTIC_ANALYSIS_SETTINGS_ID, overwrite: true }
    );

    this.ctx.logger.info('Agentic analysis disabled');

    return this.ctx.response.ok({
      body: { enabled: false, owner: null, createdAt: now, updatedAt: now },
    });
  }
}
