/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataStreamClient, type AnyDataStreamDefinition } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

/**
 * Core's data streams service, without installing anything: Kibana creates the data streams, and a
 * pod only reads and writes them. Clients are created with `lazyCreation`, so a stream that does
 * not exist yet is not created by the pod until something writes to it.
 */
export const createDataStreams = (client: ElasticsearchClient, logger: Logger) => {
  const definitions = new Map<string, AnyDataStreamDefinition>();
  const clients = new Map<string, Promise<unknown>>();

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
      initializeClient: (name: string) => {
        const definition = definitions.get(name);
        if (!definition) {
          throw new Error(`Data stream ${name} is not registered.`);
        }
        let initialized = clients.get(name);
        if (!initialized) {
          initialized = DataStreamClient.initialize({
            dataStream: definition,
            elasticsearchClient: client,
            logger,
            lazyCreation: true,
            devMode: false,
          });
          clients.set(name, initialized);
        }
        return initialized;
      },
    },
  };
};
