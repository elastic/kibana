/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import pMap from 'p-map';

import { appContextService } from '../../../app_context';
import { MAX_CONCURRENT_ILM_POLICIES_OPERATIONS } from '../../../../constants';

export const deleteIlms = async (esClient: ElasticsearchClient, ilmPolicyIds: string[]) => {
  const logger = appContextService.getLogger();

  await pMap(
    ilmPolicyIds,
    async (ilmPolicyId) => {
      await esClient.transport.request(
        {
          method: 'DELETE',
          path: `_ilm/policy/${ilmPolicyId}`,
        },
        {
          ignore: [404, 400],
        }
      );
      logger.debug(`Deleted ilm policy with id: ${ilmPolicyId}`);
    },
    {
      concurrency: MAX_CONCURRENT_ILM_POLICIES_OPERATIONS,
    }
  );
};
