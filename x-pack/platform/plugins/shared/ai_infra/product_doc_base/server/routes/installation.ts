/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { schema } from '@kbn/config-schema';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { ResourceTypes, type ResourceType } from '@kbn/product-doc-common';
import type {
  InstallationStatusResponse,
  PerformInstallResponse,
  PerformUpdateResponse,
  UninstallResponse,
  SecurityLabsInstallStatusResponse,
} from '../../common/http_api/installation';
import {
  INSTALLATION_STATUS_API_PATH,
  INSTALL_ALL_API_PATH,
  UNINSTALL_ALL_API_PATH,
  UPDATE_ALL_API_PATH,
} from '../../common/http_api/installation';
import type { InternalServices } from '../types';

/**
 * Schema for resourceType parameter validation.
 */
const resourceTypeSchema = schema.oneOf(
  [schema.literal(ResourceTypes.productDoc), schema.literal(ResourceTypes.securityLabs)],
  { defaultValue: ResourceTypes.productDoc }
);

export const registerInstallationRoutes = ({
  router,
  getServices,
}: {
  router: IRouter;
  getServices: () => InternalServices;
}) => {
  router.get(
    {
      path: INSTALLATION_STATUS_API_PATH,
      validate: {
        query: schema.object({
          inferenceId: schema.string({ defaultValue: defaultInferenceEndpoints.ELSER }),
          resourceType: resourceTypeSchema,
        }),
      },
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: [ApiPrivileges.manage('llm_product_doc')],
        },
      },
    },
    async (ctx, req, res) => {
      const { installClient, documentationManager } = getServices();
      const inferenceId = req.query?.inferenceId;
      const resourceType = req.query?.resourceType as ResourceType;

      // Handle Security Labs status separately
      if (resourceType === ResourceTypes.securityLabs) {
        const securityLabsStatus = await documentationManager.getSecurityLabsStatus({
          inferenceId,
        });
        return res.ok<SecurityLabsInstallStatusResponse>({
          body: {
            inferenceId,
            resourceType: ResourceTypes.securityLabs,
            status: securityLabsStatus.status,
            version: securityLabsStatus.version,
            latestVersion: securityLabsStatus.latestVersion,
            isUpdateAvailable: securityLabsStatus.isUpdateAvailable,
            failureReason: securityLabsStatus.failureReason,
          },
        });
      }

      // Default: product documentation status
      const installStatus = await installClient.getInstallationStatus({
        inferenceId,
      });
      const { status: overallStatus } = await documentationManager.getStatus({
        inferenceId,
      });

      return res.ok<InstallationStatusResponse>({
        body: {
          inferenceId,
          perProducts: installStatus,
          overall: overallStatus,
          resourceType: ResourceTypes.productDoc,
        },
      });
    }
  );

  router.post(
    {
      path: INSTALL_ALL_API_PATH,
      validate: {
        body: schema.object({
          inferenceId: schema.string({ defaultValue: defaultInferenceEndpoints.ELSER }),
          resourceType: resourceTypeSchema,
        }),
      },
      options: {
        access: 'internal',
        timeout: { idleSocket: 20 * 60 * 1000 }, // install can take time.
      },
      security: {
        authz: {
          requiredPrivileges: [ApiPrivileges.manage('llm_product_doc')],
        },
      },
    },
    async (ctx, req, res) => {
      const { documentationManager } = getServices();

      const inferenceId = req.body?.inferenceId;
      const resourceType = req.body?.resourceType as ResourceType;

      // Handle Security Labs installation
      if (resourceType === ResourceTypes.securityLabs) {
        await documentationManager.installSecurityLabs({
          request: req,
          wait: true,
          inferenceId,
        });

        const securityLabsStatus = await documentationManager.getSecurityLabsStatus({
          inferenceId,
        });

        return res.ok<PerformInstallResponse>({
          body: {
            installed: securityLabsStatus.status === 'installed',
            ...(securityLabsStatus.failureReason
              ? { failureReason: securityLabsStatus.failureReason }
              : {}),
          },
        });
      }

      // Default: product documentation installation
      await documentationManager.install({
        request: req,
        force: false,
        wait: true,
        inferenceId,
      });

      // check status after installation in case of failure
      const { status, installStatus } = await documentationManager.getStatus({
        inferenceId,
      });

      let failureReason = null;
      if (status === 'error' && installStatus) {
        failureReason = Object.values(installStatus)
          .filter((product) => product.status === 'error' && product.failureReason)
          .map((product) => product.failureReason)
          .join('\n');
      }
      return res.ok<PerformInstallResponse>({
        body: {
          installed: status === 'installed',
          ...(failureReason ? { failureReason } : {}),
        },
      });
    }
  );

  router.post(
    {
      path: UPDATE_ALL_API_PATH,
      validate: {
        body: schema.object({
          forceUpdate: schema.boolean({ defaultValue: false }),
          inferenceIds: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
      options: {
        access: 'internal',
        timeout: { idleSocket: 20 * 60 * 1000 }, // install can take time.
      },
      security: {
        authz: {
          requiredPrivileges: [ApiPrivileges.manage('llm_product_doc')],
        },
      },
    },
    async (ctx, req, res) => {
      const { forceUpdate } = req.body ?? {};

      const { documentationManager } = getServices();

      const updated = await documentationManager.updateAll({
        request: req,
        forceUpdate,
        // If inferenceIds is provided, use it, otherwise use all previously installed inference IDs
        inferenceIds: req.body.inferenceIds ?? [],
      });

      // check status after installation in case of failure
      const statuses: Record<string, PerformUpdateResponse> =
        await documentationManager.getStatuses({ inferenceIds: updated.inferenceIds });
      return res.ok<Record<string, PerformUpdateResponse>>({
        body: statuses,
      });
    }
  );

  router.post(
    {
      path: UNINSTALL_ALL_API_PATH,
      validate: {
        body: schema.object({
          inferenceId: schema.string({ defaultValue: defaultInferenceEndpoints.ELSER }),
          resourceType: resourceTypeSchema,
        }),
      },
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          requiredPrivileges: [ApiPrivileges.manage('llm_product_doc')],
        },
      },
    },
    async (ctx, req, res) => {
      const { documentationManager } = getServices();
      const resourceType = req.body?.resourceType as ResourceType;

      // Handle Security Labs uninstallation
      if (resourceType === ResourceTypes.securityLabs) {
        await documentationManager.uninstallSecurityLabs({
          request: req,
          wait: true,
          inferenceId: req.body?.inferenceId,
        });

        return res.ok<UninstallResponse>({
          body: {
            success: true,
          },
        });
      }

      // Default: product documentation uninstallation
      await documentationManager.uninstall({
        request: req,
        wait: true,
        inferenceId: req.body?.inferenceId,
      });

      return res.ok<UninstallResponse>({
        body: {
          success: true,
        },
      });
    }
  );
};
