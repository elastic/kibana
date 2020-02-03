/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraBackendLibs } from '../../lib/infra_types';
import { internalInfraFrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { infraMetricAlertSavedObjectType } from '../../lib/alerting/saved_object_mappings';

export const initListMetricAlerts = ({ framework }: InfraBackendLibs) =>
  framework.registerRoute({
    path: '/api/infra/alerts/list',
    method: 'GET',
    handler: async (req, res) => {
      const internalReq = req[internalInfraFrameworkRequest] as any;

      const savedObjectsClient = framework
        .getSavedObjectsService()
        .getScopedSavedObjectsClient(internalReq);

      try {
        const results = await savedObjectsClient.find({ type: infraMetricAlertSavedObjectType });
        if (!results.saved_objects) throw new Error('Could not list alerts');
        return res.response(results.saved_objects);
      } catch (e) {
        if (e && e.output) {
          return res.response(e.output.payload.message).code(e.output.statusCode);
        }
        return res.response(e).code(500);
      }
    },
  });
