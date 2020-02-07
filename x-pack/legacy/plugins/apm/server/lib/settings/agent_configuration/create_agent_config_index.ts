/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient } from 'src/core/server';
import { APMConfig } from '../../../../../../../plugins/apm/server';
import { CallCluster } from '../../../../../../../../src/legacy/core_plugins/elasticsearch';
import { getApmIndicesConfig } from '../apm_indices/get_apm_indices';

export async function createApmAgentConfigurationIndex({
  esClient,
  config
}: {
  esClient: IClusterClient;
  config: APMConfig;
}) {
  try {
    const index = getApmIndicesConfig(config).apmAgentConfigurationIndex;
    const { callAsInternalUser } = esClient;
    const indexExists = await callAsInternalUser('indices.exists', { index });
    const result = indexExists
      ? await updateExistingIndex(index, callAsInternalUser)
      : await createNewIndex(index, callAsInternalUser);

    if (!result.acknowledged) {
      const resultError =
        result && result.error && JSON.stringify(result.error);
      throw new Error(
        `Unable to create APM Agent Configuration index '${index}': ${resultError}`
      );
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Could not create APM Agent configuration:', e.message);
  }
}

function createNewIndex(index: string, callWithInternalUser: CallCluster) {
  return callWithInternalUser('indices.create', {
    index,
    body: {
      settings: { 'index.auto_expand_replicas': '0-1' },
      mappings: { properties: mappingProperties }
    }
  });
}

// Necessary for migration reasons
// Added in 7.5: `capture_body`, `transaction_max_spans`, `applied_by_agent`, `agent_name` and `etag`
function updateExistingIndex(index: string, callWithInternalUser: CallCluster) {
  return callWithInternalUser('indices.putMapping', {
    index,
    body: { properties: mappingProperties }
  });
}

const mappingProperties = {
  '@timestamp': {
    type: 'date'
  },
  service: {
    properties: {
      name: {
        type: 'keyword',
        ignore_above: 1024
      },
      environment: {
        type: 'keyword',
        ignore_above: 1024
      }
    }
  },
  settings: {
    properties: {
      transaction_sample_rate: {
        type: 'scaled_float',
        scaling_factor: 1000,
        ignore_malformed: true,
        coerce: false
      },
      capture_body: {
        type: 'keyword',
        ignore_above: 1024
      },
      transaction_max_spans: {
        type: 'short'
      }
    }
  },
  applied_by_agent: {
    type: 'boolean'
  },
  agent_name: {
    type: 'keyword',
    ignore_above: 1024
  },
  etag: {
    type: 'keyword',
    ignore_above: 1024
  }
};
