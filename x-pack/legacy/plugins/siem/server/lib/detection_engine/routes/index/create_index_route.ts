/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Boom from 'boom';

import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { LegacySetupServices, RequestFacade } from '../../../../plugin';
import { GetScopedClients } from '../../../../services';
import { transformError, getIndex } from '../utils';
import { getIndexExists } from '../../index/get_index_exists';
import { getPolicyExists } from '../../index/get_policy_exists';
import { setPolicy } from '../../index/set_policy';
import { setTemplate } from '../../index/set_template';
import { getSignalsTemplate } from './get_signals_template';
import { getTemplateExists } from '../../index/get_template_exists';
import { createBootstrapIndex } from '../../index/create_bootstrap_index';
import signalsPolicy from './signals_policy.json';

export const createCreateIndexRoute = (
  config: LegacySetupServices['config'],
  getClients: GetScopedClients
): Hapi.ServerRoute => {
  return {
    method: 'POST',
    path: DETECTION_ENGINE_INDEX_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
      },
    },
    async handler(request: RequestFacade) {
      try {
        const { clusterClient, spacesClient } = await getClients(request);
        const callCluster = clusterClient.callAsCurrentUser;

        const index = getIndex(spacesClient.getSpaceId, config);
        const indexExists = await getIndexExists(callCluster, index);
        if (indexExists) {
          return new Boom(`index: "${index}" already exists`, { statusCode: 409 });
        } else {
          const policyExists = await getPolicyExists(callCluster, index);
          if (!policyExists) {
            await setPolicy(callCluster, index, signalsPolicy);
          }
          const templateExists = await getTemplateExists(callCluster, index);
          if (!templateExists) {
            const template = getSignalsTemplate(index);
            await setTemplate(callCluster, index, template);
          }
          await createBootstrapIndex(callCluster, index);
          return { acknowledged: true };
        }
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const createIndexRoute = (
  route: LegacySetupServices['route'],
  config: LegacySetupServices['config'],
  getClients: GetScopedClients
) => {
  route(createCreateIndexRoute(config, getClients));
};
