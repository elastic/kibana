/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient } from 'kibana/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { APMConfig } from '../../../../../../../plugins/apm/server';
import { getApmIndicesConfig } from '../apm_indices/get_apm_indices';

export const createApmCustomActionIndex = async ({
  esClient,
  config
}: {
  esClient: IClusterClient;
  config: APMConfig;
}) => {
  try {
    const index = getApmIndicesConfig(config).apmCustomActionIndex;
    const { callAsInternalUser } = esClient;
    const indexExists = await callAsInternalUser('indices.exists', { index });
    const result = indexExists
      ? await updateExistingIndex(index, callAsInternalUser)
      : await createNewIndex(index, callAsInternalUser);

    if (!result.acknowledged) {
      const resultError =
        result && result.error && JSON.stringify(result.error);
      throw new Error(
        `Unable to create APM Custom Actions index '${index}': ${resultError}`
      );
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Could not create APM Custom Actions index:', e.message);
  }
};

const createNewIndex = (index: string, callWithInternalUser: CallCluster) =>
  callWithInternalUser('indices.create', {
    index,
    body: {
      settings: { 'index.auto_expand_replicas': '0-1' },
      mappings: { properties: mappingProperties }
    }
  });

const updateExistingIndex = (
  index: string,
  callWithInternalUser: CallCluster
) =>
  callWithInternalUser('indices.putMapping', {
    index,
    body: { properties: mappingProperties }
  });

const mappingProperties = {
  '@timestamp': {
    type: 'date'
  },
  label: {
    type: 'text'
  },
  url: {
    type: 'keyword'
  },
  actionId: {
    type: 'keyword'
  },
  filters: {
    properties: {
      service: {
        properties: {
          environment: {
            type: 'keyword'
          },
          name: {
            type: 'keyword'
          }
        }
      },
      transaction: {
        properties: {
          name: {
            type: 'keyword'
          },
          type: {
            type: 'keyword'
          }
        }
      }
    }
  }
};
