/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import {
  SEED_DATA_API_PATH,
  SEED_DATA_KUBERNETES_ID,
} from '../../../common/seed_data/constants';
import type { AgentBuilderDashboardsStartDependencies } from '../../types';
import { seedKubernetesData } from './seed_kubernetes';

const KUBERNETES_OTEL_PACKAGE = 'kubernetes_otel';

async function ensureKubernetesOtelPackage({
  coreSetup,
  request,
  logger,
}: {
  coreSetup: CoreSetup<AgentBuilderDashboardsStartDependencies>;
  request: KibanaRequest;
  logger: Logger;
}): Promise<{ packageInstalled: boolean; packageName?: string; packageError?: string }> {
  try {
    const [, startDeps] = await coreSetup.getStartServices();
    const fleet = startDeps.fleet;
    if (!fleet?.packageService) {
      return {
        packageInstalled: false,
        packageError: 'Fleet plugin is not available; dashboards were not installed.',
      };
    }

    const packageClient = fleet.packageService.asScoped(request);
    await packageClient.ensureInstalledPackage({ pkgName: KUBERNETES_OTEL_PACKAGE });
    return { packageInstalled: true, packageName: KUBERNETES_OTEL_PACKAGE };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to install ${KUBERNETES_OTEL_PACKAGE}: ${message}`);
    return {
      packageInstalled: false,
      packageName: KUBERNETES_OTEL_PACKAGE,
      packageError: message,
    };
  }
}

export function registerSeedDataRoute({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<AgentBuilderDashboardsStartDependencies>;
  logger: Logger;
}): void {
  router.post(
    {
      path: `${SEED_DATA_API_PATH}/${SEED_DATA_KUBERNETES_ID}`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.writeAgentBuilder],
        },
      },
      validate: {
        body: schema.maybe(schema.object({}, { unknowns: 'ignore' })),
      },
    },
    async (context, request, response) => {
      const core = await context.core;

      try {
        const packageResult = await ensureKubernetesOtelPackage({
          coreSetup,
          request,
          logger,
        });

        // Use the internal user so prototype seeding works on deployed clusters
        // where the signed-in user may lack index/template privileges.
        const result = await seedKubernetesData(core.elasticsearch.client.asInternalUser, logger);

        return response.ok({
          body: {
            id: SEED_DATA_KUBERNETES_ID,
            ...result,
            ...packageResult,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Kubernetes seed failed: ${message}`);
        return response.customError({
          statusCode: 500,
          body: { message },
        });
      }
    }
  );
}
