/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../new_platform/plugin';
import { jobAuditMessagesProvider } from '../models/job_audit_messages';

/**
 * Routes for job audit message routes
 */
export function jobAuditMessagesRoutes({ xpackMainPlugin, router }: RouteInitialization) {
  /**
   * @apiGroup JobAuditMessages
   *
   * @api {get} /api/ml/job_audit_messages/messages/:jobId Get audit messages
   * @apiName GetJobAuditMessages
   * @apiDescription Returns audit messages for specified job ID
   */
  router.get(
    {
      path: '/api/ml/job_audit_messages/messages/{jobId}',
      validate: {
        params: schema.object({ jobId: schema.maybe(schema.string()) }),
        query: schema.maybe(schema.object({ from: schema.maybe(schema.any()) })),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { getJobAuditMessages } = jobAuditMessagesProvider(
          context.ml!.mlClient.callAsCurrentUser
        );
        const { jobId } = request.params;
        const { from } = request.query;
        const resp = await getJobAuditMessages(jobId, from);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup JobAuditMessages
   *
   * @api {get} /api/ml/results/anomalies_table_data Get all audit messages
   * @apiName GetAllJobAuditMessages
   * @apiDescription Returns all audit messages
   */
  router.get(
    {
      path: '/api/ml/job_audit_messages/messages',
      validate: {
        params: schema.object({ jobId: schema.maybe(schema.string()) }),
        query: schema.maybe(schema.object({ from: schema.maybe(schema.any()) })),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { getJobAuditMessages } = jobAuditMessagesProvider(
          context.ml!.mlClient.callAsCurrentUser
        );
        const { from } = request.query;
        const resp = await getJobAuditMessages(undefined, from);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
