/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { APMPluginContract } from '../../../../../../plugins/apm/server/plugin';
import { getInternalSavedObjectsClient } from '../helpers/saved_objects_client';
import { CallCluster } from '../../../../../../../src/legacy/core_plugins/elasticsearch';
import { TIMESTAMP } from '../../../common/elasticsearch_fieldnames';

export async function createServiceConnectionsIndex(server: Server) {
  const callCluster = server.plugins.elasticsearch.getCluster('data')
    .callWithInternalUser;
  const apmPlugin = server.newPlatform.setup.plugins.apm as APMPluginContract;

  try {
    const apmIndices = await apmPlugin.getApmIndices(
      getInternalSavedObjectsClient(server)
    );
    const index = apmIndices.apmServiceConnectionsIndex;
    const indexExists = await callCluster('indices.exists', { index });
    if (!indexExists) {
      const result = await createNewIndex(index, callCluster);

      if (!result.acknowledged) {
        const resultError =
          result && result.error && JSON.stringify(result.error);
        throw new Error(
          `Unable to create APM Service Connections index '${index}': ${resultError}`
        );
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Could not create APM Service Connections:', e.message);
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

const mappingProperties = {
  [TIMESTAMP]: {
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
  callee: {
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
  connection: {
    properties: {
      upstream: {
        properties: {
          list: {
            type: 'keyword',
            ignore_above: 1024
          }
        }
      },
      in_trace: {
        type: 'keyword',
        ignore_above: 1024
      },
      type: {
        type: 'keyword',
        ignore_above: 1024
      },
      subtype: {
        type: 'keyword',
        ignore_above: 1024
      }
    }
  },
  destination: {
    properties: {
      address: {
        type: 'keyword',
        ignore_above: 1024
      }
    }
  }
};
