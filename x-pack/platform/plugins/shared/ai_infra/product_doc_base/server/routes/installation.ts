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
import type {
  InstallationStatusResponse,
  PerformInstallResponse,
  PerformUpdateResponse,
  UninstallResponse,
} from '../../common/http_api/installation';
import {
  INSTALLATION_STATUS_API_PATH,
  INSTALL_ALL_API_PATH,
  UNINSTALL_ALL_API_PATH,
  UPDATE_ALL_API_PATH,
} from '../../common/http_api/installation';
import type { InternalServices } from '../types';

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
