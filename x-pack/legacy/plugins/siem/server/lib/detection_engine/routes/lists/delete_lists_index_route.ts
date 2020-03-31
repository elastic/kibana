/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_INDEX } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../utils';
import { getIndexExists } from '../../index/get_index_exists';
import { getPolicyExists } from '../../index/get_policy_exists';
import { deletePolicy } from '../../index/delete_policy';
import { getTemplateExists } from '../../index/get_template_exists';
import { deleteAllIndex } from '../../index/delete_all_index';
import { deleteTemplate } from '../../index/delete_template';

/**
 * Deletes all of the indexes, template, ilm policies, and aliases. You can check
 * this by looking at each of these settings from ES after a deletion:
 *
 * GET /_template/.siem-lists-default
 * GET /.siem-lists-default-000001/
 * GET /_ilm/policy/.siem-lists-default
 * GET /_alias/.siem-lists-default
 *
 * GET /_template/.siem-items-default
 * GET /.siem-items-default-000001/
 * GET /_ilm/policy/.siem-items-default
 * GET /_alias/.siem-items-default
 *
 * And ensuring they're all gone
 */
export const deleteListsIndexRoute = (router: IRouter) => {
  router.delete(
    {
      path: DETECTION_ENGINE_LIST_INDEX,
      validate: false,
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        // TODO: Write Change all of this code below
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem?.getSiemClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const callCluster = clusterClient.callAsCurrentUser;
        const { listsIndex, listsItemsIndex } = siemClient;

        const listsIndexExists = await getIndexExists(callCluster, listsIndex);
        const listsItemsIndexExists = await getIndexExists(callCluster, listsItemsIndex);

        if (!listsIndexExists && !listsItemsIndexExists) {
          return siemResponse.error({
            statusCode: 404,
            body: `index: "${listsIndexExists}" and "${listsItemsIndexExists}" does not exist`,
          });
        } else {
          if (listsIndexExists) {
            await deleteAllIndex(callCluster, `${listsIndex}-*`);
          }
          if (listsItemsIndexExists) {
            await deleteAllIndex(callCluster, `${listsItemsIndex}-*`);
          }

          const listsPolicyExists = await getPolicyExists(callCluster, listsIndex);
          const listsItemsPolicyExists = await getPolicyExists(callCluster, listsItemsIndex);

          if (listsPolicyExists) {
            await deletePolicy(callCluster, listsIndex);
          }
          if (listsItemsPolicyExists) {
            await deletePolicy(callCluster, listsItemsIndex);
          }

          const listsTemplateExists = await getTemplateExists(callCluster, listsIndex);
          const listsItemsTemplateExists = await getTemplateExists(callCluster, listsItemsIndex);

          if (listsTemplateExists) {
            await deleteTemplate(callCluster, listsIndex);
          }
          if (listsItemsTemplateExists) {
            await deleteTemplate(callCluster, listsItemsIndex);
          }

          return response.ok({ body: { acknowledged: true } });
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
