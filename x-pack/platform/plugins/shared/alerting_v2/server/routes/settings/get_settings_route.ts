/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import {
  AGENTIC_ANALYSIS_SETTINGS_TYPE,
  AGENTIC_ANALYSIS_SETTINGS_ID,
} from './agentic_analysis_constants';
import { AgenticAnalysisSavedObjectsClientToken } from './agentic_analysis_tokens';

@injectable()
export class GetSettingsRoute extends BaseAlertingRoute {
  static method = 'get' as const;
  static path = '/api/alerting/v2/settings';

  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.read],
    },
  };

  static routeOptions = {
    summary: 'Get alerting v2 settings',
  } as const;

  static validate = false as const;

  protected readonly routeName = 'get settings';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(AgenticAnalysisSavedObjectsClientToken)
    private readonly soClient: SavedObjectsClientContract
  ) {
    super(ctx);
  }

  protected async execute() {
    const agenticAnalysis = await this.getAgenticAnalysisSettings();

    return this.ctx.response.ok({
      body: {
        agenticAnalysis,
      },
    });
  }

  private async getAgenticAnalysisSettings() {
    try {
      const so = await this.soClient.get(
        AGENTIC_ANALYSIS_SETTINGS_TYPE,
        AGENTIC_ANALYSIS_SETTINGS_ID
      );

      const attrs = so.attributes as {
        enabled: boolean;
        auth: { owner: string };
        createdAt: string;
        updatedAt: string;
      };

      return {
        enabled: attrs.enabled,
        owner: attrs.auth?.owner ?? null,
        createdAt: attrs.createdAt,
        updatedAt: attrs.updatedAt,
      };
    } catch (err: unknown) {
      const soErr = err as { output?: { statusCode?: number } };
      if (soErr.output?.statusCode === 404) {
        return { enabled: false, owner: null, createdAt: null, updatedAt: null };
      }
      throw err;
    }
  }
}
