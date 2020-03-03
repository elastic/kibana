/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { LegacyServices, LegacyRequest } from '../../../../types';
import { GetScopedClients } from '../../../../services';
import { transformError, getIndex } from '../utils';
import { getIndexExists } from '../../index/get_index_exists';
import { getPolicyExists } from '../../index/get_policy_exists';
import { deletePolicy } from '../../index/delete_policy';
import { getTemplateExists } from '../../index/get_template_exists';
import { deleteAllIndex } from '../../index/delete_all_index';
import { deleteTemplate } from '../../index/delete_template';

/**
 * Deletes all of the indexes, template, ilm policies, and aliases. You can check
 * this by looking at each of these settings from ES after a deletion:
 * GET /_template/.siem-signals-default
 * GET /.siem-signals-default-000001/
 * GET /_ilm/policy/.signals-default
 * GET /_alias/.siem-signals-default
 *
 * And ensuring they're all gone
 */
export const createDeleteIndexRoute = (
  config: LegacyServices['config'],
  getClients: GetScopedClients
): Hapi.ServerRoute => {
  return {
    method: 'DELETE',
    path: DETECTION_ENGINE_INDEX_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
      },
    },
    async handler(request: LegacyRequest, headers) {
      try {
        const { clusterClient, spacesClient } = await getClients(request);
        const callCluster = clusterClient.callAsCurrentUser;

        const index = getIndex(spacesClient.getSpaceId, config);
        const indexExists = await getIndexExists(callCluster, index);
        if (!indexExists) {
          return headers
            .response({
              message: `index: "${index}" does not exist`,
              status_code: 404,
            })
            .code(404);
        } else {
          await deleteAllIndex(callCluster, `${index}-*`);
          const policyExists = await getPolicyExists(callCluster, index);
          if (policyExists) {
            await deletePolicy(callCluster, index);
          }
          const templateExists = await getTemplateExists(callCluster, index);
          if (templateExists) {
            await deleteTemplate(callCluster, index);
          }
          return { acknowledged: true };
        }
      } catch (err) {
        const error = transformError(err);
        return headers
          .response({
            message: error.message,
            status_code: error.statusCode,
          })
          .code(error.statusCode);
      }
    },
  };
};

export const deleteIndexRoute = (
  route: LegacyServices['route'],
  config: LegacyServices['config'],
  getClients: GetScopedClients
) => {
  route(createDeleteIndexRoute(config, getClients));
};
