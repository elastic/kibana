/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  INSTALL_API_PATH,
  STATUS_API_PATH,
  DatasetSampleType,
  type StatusResponse,
  type InstallResponse,
} from '../../common';
import { InternalServices } from '../types';

export const registerInstallationRoutes = ({
  router,
  getServices,
}: {
  router: IRouter;
  getServices: () => InternalServices;
}) => {
  router.post(
    {
      path: INSTALL_API_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: false,
      options: {
        access: 'internal',
        timeout: { idleSocket: 3 * 60 * 1000 }, // install can take time.
      },
    },
    async (ctx, req, res) => {
      const core = await ctx.core;
      const esClient = core.elasticsearch.client.asCurrentUser;

      const { sampleDataManager } = getServices();

      try {
        const indexName = await sampleDataManager.installSampleData({
          sampleType: DatasetSampleType.elasticsearch,
          esClient,
        });

        return res.ok<InstallResponse>({
          body: {
            status: 'installed',
            indexName,
          },
        });
      } catch (e) {
        switch (e?.meta?.body?.error?.type) {
          case 'resource_already_exists_exception':
            return res.conflict({
              body: {
                message: e.message,
              },
            });
        }

        return res.customError({
          statusCode: e?.meta && e.meta?.statusCode ? e.meta?.statusCode : 500,
          body: {
            message: i18n.translate('xpack.sampleDataIngest.server.installSample.errorMessage', {
              defaultMessage: 'Failed to install sample data due to an exception.',
            }),
          },
        });
      }
    }
  );

  router.get(
    {
      path: STATUS_API_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    async (ctx, req, res) => {
      const core = await ctx.core;
      const esClient = core.elasticsearch.client.asCurrentUser;

      const { sampleDataManager } = getServices();

      try {
        const statusData = await sampleDataManager.getSampleDataStatus({
          sampleType: DatasetSampleType.elasticsearch,
          esClient,
        });

        return res.ok<StatusResponse>({
          body: statusData,
        });
      } catch (e) {
        return res.customError({
          statusCode: e?.meta && e.meta?.statusCode ? e.meta?.statusCode : 500,
          body: {
            message: i18n.translate('xpack.sampleDataIngest.server.getStatus.errorMessage', {
              defaultMessage: 'Failed to get status due to an exception.',
            }),
          },
        });
      }
    }
  );
};
