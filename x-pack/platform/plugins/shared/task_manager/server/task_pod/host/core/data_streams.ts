/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataStreamClient, type AnyDataStreamDefinition } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

/**
 * `DataStreamsService` is not used: its `start` initializes every registered stream through
 * `DataStreamClient.initialize`, which installs and updates index templates, applies mapping
 * changes and, for `initializeClient`, creates the data stream. A pod never installs anything:
 * Kibana does, in its own `start`. Clients are built with `DataStreamClient.fromDefinition`, the
 * runtime path Core documents for code that runs after setup: no calls to Elasticsearch until the
 * first read or write, and a stream that does not exist yet is auto-created by Elasticsearch on the
 * first write, through the template Kibana installed.
 */
export const createDataStreams = (client: ElasticsearchClient) => {
  const definitions = new Map<string, AnyDataStreamDefinition>();
  const clients = new Map<string, unknown>();

  return {
    setup: {
      registerDataStream: (definition: AnyDataStreamDefinition) => {
        if (definitions.has(definition.name)) {
          throw new Error(`Data stream ${definition.name} is already registered.`);
        }
        definitions.set(definition.name, definition);
      },
    },
    start: {
      initializeClient: async (name: string) => {
        const definition = definitions.get(name);
        if (!definition) {
          throw new Error(`Data stream ${name} is not registered.`);
        }
        let dataStreamClient = clients.get(name);
        if (!dataStreamClient) {
          dataStreamClient = DataStreamClient.fromDefinition({
            dataStream: definition,
            elasticsearchClient: client,
          });
          clients.set(name, dataStreamClient);
        }
        return dataStreamClient;
      },
    },
  };
};
