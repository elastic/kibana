/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { TransportResult } from '@elastic/elasticsearch';

import { PolicyFromES, SerializedPolicy } from '../../../../common/types';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

interface PoliciesMap {
  [K: string]: {
    modified_date: string;
    policy: SerializedPolicy;
    version: number;
    in_use_by: {
      indices: string[];
      data_streams: string[];
      composable_templates: string[];
    };
  };
}

function formatPolicies(policiesMap: PoliciesMap): PolicyFromES[] {
  return Object.keys(policiesMap).reduce((accum: PolicyFromES[], lifecycleName: string) => {
    const policyEntry = policiesMap[lifecycleName];
    const {
      in_use_by: { indices, data_streams: dataStreams, composable_templates: indexTemplates },
      modified_date: modifiedDate,
      policy,
      version,
    } = policyEntry;
    accum.push({
      name: lifecycleName,
      modifiedDate,
      version,
      policy,
      indices,
      dataStreams,
      indexTemplates,
    });
    return accum;
  }, []);
}

async function fetchPolicies(client: ElasticsearchClient): Promise<TransportResult<PoliciesMap>> {
  const options = {
    // we allow 404 since they may have no policies
    ignore: [404],
    meta: true,
  };

  // @ts-expect-error Policy doesn't contain all known properties (name, in_use_by)
  return client.ilm.getLifecycle({}, options);
}

export function registerFetchRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/policies'), validate: false },
    license.guardApiRoute(async (context, request, response) => {
      const { asCurrentUser } = (await context.core).elasticsearch.client;

      try {
        const policiesResponse = await fetchPolicies(asCurrentUser);
        if (policiesResponse.statusCode === 404) {
          return response.ok({ body: [] });
        }

        return response.ok({ body: formatPolicies(policiesResponse.body) });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
