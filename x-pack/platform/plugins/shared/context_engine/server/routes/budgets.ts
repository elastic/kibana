/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaResponseFactory, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  MAX_MONTHLY_BUDGET_USD,
  type AiIndexBudget,
  type AiIndexBudgetStatusResponse,
  type PutAiIndexBudgetResponse,
  type SpaceBudgetStatusResponse,
} from '../../common/budgets';
import {
  AI_INDEX_BUDGET_PATH,
  AI_INDEX_INTERNAL_API_VERSION,
  SPACE_BUDGETS_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { AiIndexAuditAction, aiIndexAuditEvent } from '../audit/audit_events';
import type { BudgetServiceApi } from '../budgets';
import { formatErrorMessage } from '../utils/format_es_error';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { aiIndexIdParamsSchema } from './schemas/ai_indices_schema';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

const monthlyLimitSchema = schema.maybe(schema.number({ min: 0, max: MAX_MONTHLY_BUDGET_USD }));

const aiIndexBudgetSchema = schema.object({
  suggestions_monthly_usd: monthlyLimitSchema,
  automations_monthly_usd: monthlyLimitSchema,
  cost_tier: schema.maybe(
    schema.oneOf([schema.literal('cheap'), schema.literal('medium'), schema.literal('expensive')])
  ),
});

const handleBudgetError = (error: unknown, response: KibanaResponseFactory, logger: Logger) => {
  if (error instanceof AiIndexNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
  return response.customError({ statusCode: 500, body: { message: formatErrorMessage(error) } });
};

/** Drops unset limits so the stored block only holds what the user configured. */
const toStoredBudget = (body: AiIndexBudget): AiIndexBudget => ({
  ...(body.suggestions_monthly_usd !== undefined && {
    suggestions_monthly_usd: body.suggestions_monthly_usd,
  }),
  ...(body.automations_monthly_usd !== undefined && {
    automations_monthly_usd: body.automations_monthly_usd,
  }),
  ...(body.cost_tier !== undefined && { cost_tier: body.cost_tier }),
});

export const registerBudgetRoutes = ({
  router,
  logger,
  getBudgetService,
  getSpaces,
}: {
  router: IRouter;
  logger: Logger;
  getBudgetService: () => BudgetServiceApi;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
}) => {
  router.versioned
    .get({
      path: SPACE_BUDGETS_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get Context Engine budgets for the space',
      description:
        'Returns month-to-date AI spend and limits for automation suggestions and automation runs, for the space and each AI index.',
    })
    .addVersion(
      { version: AI_INDEX_INTERNAL_API_VERSION, validate: false },
      withContextEngineFeatureFlag(async (_ctx, request, response) => {
        const spaceId = resolveSpaceId(await getSpaces(), request);
        try {
          const body: SpaceBudgetStatusResponse = await getBudgetService().getSpaceStatus(spaceId);
          return response.ok({ body });
        } catch (error) {
          return handleBudgetError(error, response, logger);
        }
      })
    );

  router.versioned
    .get({
      path: AI_INDEX_BUDGET_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get the budget of an AI Index',
      description:
        'Returns the budget configuration, cost tier, and month-to-date spend of an AI Index next to the space totals.',
    })
    .addVersion(
      {
        version: AI_INDEX_INTERNAL_API_VERSION,
        validate: { request: { params: aiIndexIdParamsSchema } },
      },
      withContextEngineFeatureFlag(async (_ctx, request, response) => {
        const spaceId = resolveSpaceId(await getSpaces(), request);
        try {
          const body: AiIndexBudgetStatusResponse = await getBudgetService().getAiIndexStatus(
            spaceId,
            request.params.aiIndexId
          );
          return response.ok({ body });
        } catch (error) {
          return handleBudgetError(error, response, logger);
        }
      })
    );

  router.versioned
    .put({
      path: AI_INDEX_BUDGET_PATH,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Update the budget of an AI Index',
      description:
        'Replaces the monthly limits and cost tier of an AI Index. Omitted limits fall back to the space-level settings. Permitted on managed AI Indices.',
    })
    .addVersion(
      {
        version: AI_INDEX_INTERNAL_API_VERSION,
        validate: { request: { params: aiIndexIdParamsSchema, body: aiIndexBudgetSchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const auditLogger = (await ctx.core).security.audit.logger;
        const { aiIndexId } = request.params;
        const spaceId = resolveSpaceId(await getSpaces(), request);
        try {
          const budget = await getBudgetService().setAiIndexBudget(
            spaceId,
            aiIndexId,
            toStoredBudget(request.body)
          );
          auditLogger.log(aiIndexAuditEvent({ action: AiIndexAuditAction.UPDATE, id: aiIndexId }));
          const body: PutAiIndexBudgetResponse = { budget };
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            aiIndexAuditEvent({ action: AiIndexAuditAction.UPDATE, id: aiIndexId, error })
          );
          return handleBudgetError(error, response, logger);
        }
      })
    );
};
