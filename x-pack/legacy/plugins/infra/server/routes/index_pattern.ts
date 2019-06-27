/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InfraBackendLibs } from '../lib/infra_types';
import { InfraWrappableRequest } from '../lib/adapters/framework';
import { internalInfraFrameworkRequest } from '../lib/adapters/framework';

const INDEX_PATTERN_ID = 'metricbeat-*';

// Creates a `metricbeat-*` index pattern if one doesn't already exist
async function getIndexPattern(req: InfraWrappableRequest<{}>) {
  const infraIndexPatternTitle = 'infra_oss.indexPattern';
  const savedObjectsClient = req[internalInfraFrameworkRequest].getSavedObjectsClient();
  try {
    return await savedObjectsClient.get('index-pattern', INDEX_PATTERN_ID);
  } catch (error) {
    // if GET fails, then create a new index pattern saved object
    return await savedObjectsClient.create(
      'index-pattern',
      {
        title: infraIndexPatternTitle,
      },
      { id: INDEX_PATTERN_ID, overwrite: false }
    );
  }
}

export const initGenerateIndexPattern = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'GET',
    path: '/api/infra/generate_index_pattern',
    options: {},
    handler: getIndexPattern,
  });
};
