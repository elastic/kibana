/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { apiPrivileges } from '@kbn/context-engine-plugin/common/features';
import {
  AiIndexConflictError,
  AiIndexManagedError,
  AiIndexNotFoundError,
} from '@kbn/context-engine-plugin/server/ai_indices/errors';
import { z, lazySchema } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  AUTOMATION_TEMPLATES_API_VERSION,
  AUTOMATION_TEMPLATES_PATH,
  INSTALL_AUTOMATION_TEMPLATE_PATH,
} from '../../common/automation_templates';
import {
  installAutomationTemplate,
  type InstallAutomationTemplateDependencies,
} from '../automation_templates/install_automation_template';
import {
  getAutomationTemplateCatalog,
  installAutomationTemplateRequestSchema,
  toInstallAutomationTemplateParams,
} from '../automation_templates/template_params';
import {
  ContextEngineDisabledError,
  InsufficientPrivilegesError,
  InvalidTemplateParamsError,
} from '../errors';

const MAX_AI_INDEX_ID_LENGTH = 255;

const installParamsSchema = lazySchema(() =>
  z.object({
    aiIndexId: z.string().min(1).max(MAX_AI_INDEX_ID_LENGTH),
  })
);

const toErrorResponse = (error: unknown, response: KibanaResponseFactory, logger: Logger) => {
  if (error instanceof InvalidTemplateParamsError) {
    return response.badRequest({ body: { message: error.message } });
  }
  if (error instanceof InsufficientPrivilegesError) {
    return response.forbidden({ body: { message: error.message } });
  }
  if (error instanceof AiIndexNotFoundError || error instanceof ContextEngineDisabledError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof AiIndexConflictError || error instanceof AiIndexManagedError) {
    return response.conflict({ body: { message: error.message } });
  }
  logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
  return response.customError({
    statusCode: 500,
    body: { message: error instanceof Error ? error.message : 'Failed to install the template.' },
  });
};

/** Internal routes for listing automation templates and installing one on an AI index. */
export const registerAutomationTemplateRoutes = ({
  router,
  getSpaceId,
  ...deps
}: InstallAutomationTemplateDependencies & {
  router: IRouter;
  getSpaceId: (request: KibanaRequest) => Promise<string>;
}): void => {
  router.versioned
    .get({
      path: AUTOMATION_TEMPLATES_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
      summary: 'List automation templates',
    })
    .addVersion(
      { version: AUTOMATION_TEMPLATES_API_VERSION, validate: false },
      async (_context, _request, response) =>
        response.ok({ body: { templates: getAutomationTemplateCatalog() } })
    );

  router.versioned
    .post({
      path: INSTALL_AUTOMATION_TEMPLATE_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
      summary: 'Install an automation template on an AI index',
    })
    .addVersion(
      {
        version: AUTOMATION_TEMPLATES_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(installParamsSchema),
            body: buildRouteValidationWithZod(installAutomationTemplateRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const result = await installAutomationTemplate({
            aiIndexId: request.params.aiIndexId,
            params: toInstallAutomationTemplateParams(request.body),
            request,
            spaceId: await getSpaceId(request),
            ...deps,
          });
          return response.ok({ body: result });
        } catch (error) {
          return toErrorResponse(error, response, deps.logger);
        }
      }
    );
};
