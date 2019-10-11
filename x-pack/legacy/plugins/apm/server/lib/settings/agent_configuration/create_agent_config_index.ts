/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { CallCluster } from '../../../../../../../../src/legacy/core_plugins/elasticsearch';

export async function createApmAgentConfigurationIndex(
  core: InternalCoreSetup
) {
  try {
    const { server } = core.http;
    const index = server
      .config()
      .get<string>('apm_oss.apmAgentConfigurationIndex');
    const { callWithInternalUser } = server.plugins.elasticsearch.getCluster(
      'admin'
    );
    const indexExists = await callWithInternalUser('indices.exists', { index });
    const result = indexExists
      ? await updateExistingIndex(index, callWithInternalUser)
      : await createNewIndex(index, callWithInternalUser);

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
