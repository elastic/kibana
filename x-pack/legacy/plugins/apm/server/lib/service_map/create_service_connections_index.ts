/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIMESTAMP } from '../../../common/elasticsearch_fieldnames';
import { Setup } from '../helpers/setup_request';

export async function createServiceConnectionsIndex(setup: Setup) {
  const { internalClient, indices } = setup;
  const index = indices.apmServiceConnectionsIndex;

  const indexExists = await internalClient.indexExists({ index });

  if (!indexExists) {
    const result = await createNewIndex(index, internalClient);

    if (!result.acknowledged) {
      const resultError =
        result && result.error && JSON.stringify(result.error);
      throw new Error(
        `Unable to create APM Service Connections index '${index}': ${resultError}`
      );
    }
  }
}

function createNewIndex(index: string, client: Setup['client']) {
  return client.indicesCreate({
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
