/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Boom from 'boom';

import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { ServerFacade, RequestFacade } from '../../../../types';
import { transformError, getIndex, callWithRequestFactory } from '../utils';
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
export const createDeleteIndexRoute = (server: ServerFacade): Hapi.ServerRoute => {
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
    async handler(request: RequestFacade) {
      try {
        const index = getIndex(request, server);
        const callWithRequest = callWithRequestFactory(request, server);
        const indexExists = await getIndexExists(callWithRequest, index);
        if (!indexExists) {
          return new Boom(`index: "${index}" does not exist`, { statusCode: 404 });
        } else {
          await deleteAllIndex(callWithRequest, `${index}-*`);
          const policyExists = await getPolicyExists(callWithRequest, index);
          if (policyExists) {
            await deletePolicy(callWithRequest, index);
          }
          const templateExists = await getTemplateExists(callWithRequest, index);
          if (templateExists) {
            await deleteTemplate(callWithRequest, index);
          }
          return { acknowledged: true };
        }
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const deleteIndexRoute = (server: ServerFacade) => {
  server.route(createDeleteIndexRoute(server));
};
